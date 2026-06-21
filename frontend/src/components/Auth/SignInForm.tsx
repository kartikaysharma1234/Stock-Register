import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAppContext } from "../../AppProvider/AppContext";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";
import { getRoute, request, tokenStorage } from "../../service";
import type { AuthPayload } from "../../types";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;

const readAccessToken = (payload: AuthPayload) =>
  payload.tokens?.accessToken ?? payload.accessToken;

const readRefreshToken = (payload: AuthPayload) =>
  payload.tokens?.refreshToken ?? payload.refreshToken;

export const SignInForm = () => {
  const navigate = useNavigate();
  const { setSession } = useAppContext();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setSubmitting(true);
    try {
      const payload = await request<AuthPayload, SignInValues>(
        getRoute("auth.login"),
        { data: values },
      );
      const accessToken = readAccessToken(payload);
      if (!accessToken) throw new Error("Login response did not include an access token");

      tokenStorage.setTokens(accessToken, readRefreshToken(payload));
      setSession(payload.user, payload.organization ?? null);
      toast.success("Signed in successfully");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        autoComplete="email"
        error={errors.email?.message}
        label="Email"
        registration={register("email")}
        type="email"
      />
      <FormInput
        autoComplete="current-password"
        error={errors.password?.message}
        label="Password"
        registration={register("password")}
        type="password"
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Sign in
      </PrimaryButton>
      <div className="flex items-center justify-between text-sm">
        <Link className="text-app-accent hover:text-app-accentHover" to="/auth/register">
          Create organization
        </Link>
        <Link
          className="text-app-accent hover:text-app-accentHover"
          to="/auth/forgot-password"
        >
          Forgot password
        </Link>
      </div>
    </form>
  );
};
