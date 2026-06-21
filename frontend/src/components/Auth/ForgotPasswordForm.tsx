import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { z } from "zod";
import { getRoute, request } from "../../service";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitting(true);
    try {
      await request<null, ForgotPasswordValues>(getRoute("auth.forgotPassword"), {
        data: values,
      });
      toast.success("Password reset email queued if the account exists");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send reset email";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        error={errors.email?.message}
        label="Email"
        registration={register("email")}
        type="email"
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Send reset link
      </PrimaryButton>
      <Link className="block text-center text-sm text-app-accent" to="/auth/login">
        Back to sign in
      </Link>
    </form>
  );
};
