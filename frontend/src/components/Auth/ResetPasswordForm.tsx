import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { getRoute, request } from "../../service";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

const resetPasswordSchema = z.object({
  token: z.string().min(32, "Paste the full reset token"),
  password: passwordSchema,
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get("token") ?? "",
      password: "",
    },
  });

  const onSubmit = async (values: ResetPasswordValues) => {
    setSubmitting(true);
    try {
      await request<null, ResetPasswordValues>(getRoute("auth.resetPassword"), {
        data: values,
      });
      toast.success("Password reset. You can sign in now.");
      navigate("/auth/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset password";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        error={errors.token?.message}
        label="Reset token"
        registration={register("token")}
      />
      <FormInput
        error={errors.password?.message}
        label="New password"
        registration={register("password")}
        type="password"
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Reset password
      </PrimaryButton>
    </form>
  );
};
