import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase-config";
import { Link } from "react-router-dom";

import { Button } from "@sage/ui";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@sage/ui";
import { Input } from "@sage/ui";

const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordForm(props: { 
    setLoading: (loading: boolean) => void;
    onSubmitted?: () => void;
}) {
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "" },
    });

    async function onSubmit(data: FormValues) {
        try {
            props.setLoading(true);
            await sendPasswordResetEmail(auth, data.email);
            setSubmitted(true);
            props.onSubmitted?.();
            props.setLoading(false);
        } catch (error: unknown) {
            props.setLoading(false);
            const code = (error as any)?.code;
            if (code === 'auth/too-many-requests') {
                setError("Too many attempts. Please try again later.");
            } else {
                setError("Something went wrong. Please try again.");
            }
        }
    }

    if (submitted) return (
        <div className="w-full space-y-4 pb-4 text-center">
            <p className="text-sm text-textdark">If an account exists for that email, a reset link has been sent.</p>
            <p className="text-xs text-textsecondary">
                Didn't get an email? You may have signed up with Google —{" "}
                <Link to="/login" className="text-buttonhover opacity-100 hover:underline">try signing in with Google instead</Link>.
            </p>
            <Link to="/login" className="text-[15px] text-textsecondary hover:underline block">
                Back to Login
            </Link>
        </div>
    );

    return (
        <div className="w-full space-y-6 pb-4">
            <Form {...form}>
                {error && <small className="text-destructive">{error}</small>}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-textdark text-[15px]">
                                    Email
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter email"
                                        type="email"
                                        className="h-[2.5rem] px-4 rounded-full border border-border text-[15px] placeholder:text-textsecondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                                        {...field}
                                        onChange={(e) => {
                                            setError(null);
                                            field.onChange(e);
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full h-[2.5rem] rounded-full bg-accent hover:bg-buttonhover text-[15px] text-textdark"
                    >
                        Reset Password
                    </Button>
                </form>
            </Form>

            <div className="flex justify-center">
                <Link to="/login" className="text-[15px] text-textsecondary hover:underline">
                    Back to Login
                </Link>
            </div>
        </div>
    );
}