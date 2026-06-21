import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { getRoute, request } from "../../service";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";

const verifyEmailSchema = z.object({
  token: z.string().min(32, "Paste the full verification token"),
});

type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: searchParams.get("token") ?? "" },
  });

  const onSubmit = async (values: VerifyEmailValues) => {
    setSubmitting(true);
    try {
      await request<unknown, VerifyEmailValues>(getRoute("auth.verifyEmail"), {
        data: values,
      });
      toast.success("Email verified");
      navigate("/auth/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to verify email";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        error={errors.token?.message}
        label="Verification token"
        registration={register("token")}
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Verify email
      </PrimaryButton>
    </form>
  );
};
