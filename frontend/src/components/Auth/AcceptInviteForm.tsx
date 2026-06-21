import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useAppContext } from "../../AppProvider/AppContext";
import { getRoute, request, tokenStorage } from "../../service";
import type { AuthPayload } from "../../types";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

const acceptInviteSchema = z.object({
  token: z.string().min(32, "Paste the full invitation token"),
  password: passwordSchema,
});

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

export const AcceptInviteForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAppContext();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteValues>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      token: searchParams.get("token") ?? "",
      password: "",
    },
  });

  const onSubmit = async (values: AcceptInviteValues) => {
    setSubmitting(true);
    try {
      const payload = await request<AuthPayload, AcceptInviteValues>(
        getRoute("auth.acceptInvite"),
        { data: values },
      );
      const accessToken = payload.tokens?.accessToken ?? payload.accessToken;
      if (accessToken) {
        tokenStorage.setTokens(
          accessToken,
          payload.tokens?.refreshToken ?? payload.refreshToken,
        );
        setSession(payload.user, payload.organization ?? null);
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/auth/login", { replace: true });
      }
      toast.success("Invitation accepted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to accept invitation";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        error={errors.token?.message}
        label="Invitation token"
        registration={register("token")}
      />
      <FormInput
        error={errors.password?.message}
        label="Create password"
        registration={register("password")}
        type="password"
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Accept invite
      </PrimaryButton>
    </form>
  );
};
