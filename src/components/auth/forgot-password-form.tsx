import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase-config";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordForm(props: { setLoading: (loading: boolean) => void }) {
    const [error, setError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "" },
    });

    async function onSubmit(data: FormValues) {
        try {
            props.setLoading(true);
            await sendPasswordResetEmail(auth, data.email);
            toast.success("Password reset link sent! Check your email.");
            props.setLoading(false);
        } catch (error: unknown) {
            props.setLoading(false);
            setError("Error sending password reset email. Try again.");
            toast.error("Error sending password reset email. Try again.");
        }
    }

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
