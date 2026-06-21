import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { PrimaryButton } from "../common/Buttons";
import { FormInput } from "../common/Forms";
import { getRoute, request } from "../../service";

const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

const signUpSchema = z.object({
  organizationName: z.string().min(2, "Organization name is required"),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  billingEmail: z.string().email("Enter a billing email"),
  adminName: z.string().min(2, "Admin name is required"),
  adminEmail: z.string().email("Enter an admin email"),
  password: passwordSchema,
});

type SignUpValues = z.infer<typeof signUpSchema>;

interface RegisterPayload {
  organization: {
    name: string;
    slug?: string;
    billingEmail: string;
  };
  admin: {
    name: string;
    email: string;
    password: string;
  };
}

export const SignUpForm = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      organizationName: "",
      slug: "",
      billingEmail: "",
      adminName: "",
      adminEmail: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignUpValues) => {
    const payload: RegisterPayload = {
      organization: {
        name: values.organizationName,
        billingEmail: values.billingEmail,
        ...(values.slug ? { slug: values.slug } : {}),
      },
      admin: {
        name: values.adminName,
        email: values.adminEmail,
        password: values.password,
      },
    };

    setSubmitting(true);
    try {
      await request<unknown, RegisterPayload>(getRoute("auth.register"), {
        data: payload,
      });
      toast.success("Organization created. Verify email, then sign in.");
      navigate("/auth/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create organization";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          error={errors.organizationName?.message}
          label="Organization name"
          registration={register("organizationName")}
        />
        <FormInput
          error={errors.slug?.message}
          label="Slug"
          placeholder="north-warehouse"
          registration={register("slug")}
        />
      </div>
      <FormInput
        error={errors.billingEmail?.message}
        label="Billing email"
        registration={register("billingEmail")}
        type="email"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          error={errors.adminName?.message}
          label="Admin name"
          registration={register("adminName")}
        />
        <FormInput
          error={errors.adminEmail?.message}
          label="Admin email"
          registration={register("adminEmail")}
          type="email"
        />
      </div>
      <FormInput
        error={errors.password?.message}
        label="Password"
        registration={register("password")}
        type="password"
      />
      <PrimaryButton className="w-full" loading={submitting} type="submit">
        Create organization
      </PrimaryButton>
      <p className="text-center text-sm text-app-muted">
        Already onboarded?{" "}
        <Link className="text-app-accent hover:text-app-accentHover" to="/auth/login">
          Sign in
        </Link>
      </p>
    </form>
  );
};
