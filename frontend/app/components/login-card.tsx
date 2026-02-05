'use client'
import Image from "next/image";
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";

export function LoginCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const switchMode = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setSignupStep(1);
  };
  const [firstNameInput, setFirstNameInput] = useState("");
  const [middleNameInput, setMiddleNameInput] = useState("");
  const [lastNameInput, setLastNameInput] = useState("");
  const [signUpEmailInput, setSignUpEmailInput] = useState("");
  const [signUpPasswordInput, setSignUpPasswordInput] = useState("");

  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  
  const [showEmptyNameAlert, setShowEmptyNameAlert] = useState(false);
  const [showEmptySignUpEmailOrPassAlert, setShowEmptySignUpEmailOrPassAlert] = useState(false);
  const [showEmptyEmailOrPassAlert, setShowEmptyEmailOrPassAlert] = useState(false);
  
  const [signupData, setSignupData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  
  const handleCreateAccount = () => {
    const payload = {
      first_name: signupData.first_name,
      middle_name: signupData.middle_name,
      last_name: signupData.last_name,
      email: signUpEmailInput,
      password: signUpPasswordInput,
    };
  
    // update state (optional)
    console.log(JSON.stringify(payload));
    
  
    // send to backend
    fetch("http://localhost:8000/users/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  };

  async function login(email: string, password: string) {
    const res = await fetch("http://localhost:8000/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: email, // OAuth2 uses "username"
        password: password,
      }),
    });
  
    if (!res.ok) {
      throw new Error("Invalid email or password");
    }
  
    return res.json(); // { access_token, token_type }
  }



  

  return (
    <Card className="w-full max-w-208 flex flex-row px-8 relative overflow-hidden bg-nj-cream">
      
      {/* BACKGROUND LAYER */}
      <div className="flex-1 relative flex items-center justify-center z-10">
          <Image
            src="/hello.svg"
            alt="NJ'S Café and Restaurant"
            fill
            className="object-contain"
            priority
          />
        <Image
          src="/hello.svg"
          alt="NJ'S Café and Restaurant"
          fill
          className="object-contain"
          priority
        />
      </div>
      <Card className="flex-1 min-h-[25rem] z-10">
        <CardHeader>
          <CardTitle>
            {authMode === "login"
              ? "Login to your account"
              : signupStep === 1
                ? "Create your account"
                : "Almost there"}
          </CardTitle>
        
          <CardDescription>
            {authMode === "login"
              ? "Enter your email below to login"
              : signupStep === 1
                ? "Tell us your name"
                : "Set your login details"}
          </CardDescription>
        
          <CardAction>
            <Button
              variant="link"
              onClick={() =>
                switchMode(authMode === "login" ? "signup" : "login")
              }
            >
              {authMode === "login" ? "Sign Up" : "Login"}
            </Button>
          </CardAction>
        </CardHeader>


        <CardContent>
          {/*className="flex-1 flex items-center justify-center"*/}
          <form>
            {/*className="w-full max-w-sm"*/}
            <div className="flex flex-col gap-6">
        
              {/* LOGIN */}
              {authMode === "login" && (
                <>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      id="email"
                      placeholder="m@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                  </div>
        
                  <div className="grid gap-2">
                    <Label>Password</Label>
                    <Input
                      id="password"
                      placeholder="********"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
        
              {/* SIGNUP STEP 1 */}
              {authMode === "signup" && signupStep === 1 && (
                <>
                  <div className="grid gap-2">
                    <Label>First name<span className="text-red-500">*</span></Label>
                    <Input
                      id="first_name"
                      placeholder="Ashim"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      required
                    />
                  </div>
        
                  <div className="grid gap-2">
                    <Label>Middle name</Label>
                    <Input
                      id="middle_name"
                      placeholder="Raj"
                      value={middleNameInput}
                      onChange={(e) => setMiddleNameInput(e.target.value)}
                    />
                  </div>
        
                  <div className="grid gap-2">
                    <Label>Last name<span className="text-red-500">*</span></Label>
                    <Input
                      id="last_name"
                      placeholder="Parajuli"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      required
                    />

                  </div>
                </>
              )}
        
              {/* SIGNUP STEP 2 */}
              {authMode === "signup" && signupStep === 2 && (
                <>
                  <div className="grid gap-2">
                    <Label>Email<span className="text-red-500">*</span></Label>
                    <Input
                      id="sign_up_email"
                      placeholder="m@example.com"
                      value={signUpEmailInput}
                      onChange={(e) => setSignUpEmailInput(e.target.value)}
                      required
                    />

                  </div>
        
                  <div className="grid gap-2">
                    <Label>Password<span className="text-red-500">*</span></Label>
                    <Input
                      id="sign_up_password"
                      placeholder="********"
                      value={signUpPasswordInput}
                      onChange={(e) => setSignUpPasswordInput(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
        
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex-col gap-2">
        
          {/* LOGIN */}
          {authMode === "login" && (
            <>
              
              
              <Button
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const data = await login(emailInput, passwordInput);
                    localStorage.setItem("access_token", data.access_token);
                    router.push("/dashboard");
                  } catch {
                    setShowEmptyEmailOrPassAlert(true);
                    setLoading(false);
                  }
                }}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>


              {/*<Button variant="outline" className="w-full">
                Login with Google
              </Button>*/}
            </>
          )}
        
          {/* SIGNUP STEP 1 */}
          {authMode === "signup" && signupStep === 1 && (
            <Button
              className="w-full"
              onClick={() => {
                if (firstNameInput.trim() === "" || lastNameInput.trim() === "") {
                  // show the alert dialog
                  setShowEmptyNameAlert(true);
                } else {
                  // proceed to step 2
                  setSignupStep(2);
                  setSignupData((prev) => ({
                    ...prev,
                    first_name: firstNameInput,
                    middle_name: middleNameInput,
                    last_name: lastNameInput,
                  }));
                }
              }}
            >
              Next
            </Button>
          )}
        
          {/* SIGNUP STEP 2 */}
          {authMode === "signup" && signupStep === 2 && (
            <Button
              className="w-full"
              onClick={() => {
                if (
                  signupData.first_name.trim() === "" ||
                  signupData.last_name.trim() === "" ||
                  signUpEmailInput.trim() === "" ||
                  signUpPasswordInput.trim() === ""
                ) {
                  setShowEmptySignUpEmailOrPassAlert(true);
                  return;
                }
                
            
                handleCreateAccount();
              }}
            >
              Create Account
            </Button>

          )}
        
        </CardFooter>

      </Card>
      <AlertDialog 
        open={showEmptyNameAlert || showEmptySignUpEmailOrPassAlert || showEmptyEmailOrPassAlert} 
        onOpenChange={(open) => {
          if (!open) {
            setShowEmptyNameAlert(false);
            setShowEmptySignUpEmailOrPassAlert(false);
            setShowEmptyEmailOrPassAlert(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Required fields missing</AlertDialogTitle>
            <AlertDialogDescription>
              {showEmptyNameAlert && "First name and last name cannot be empty. Please fill them to continue."}
              {showEmptySignUpEmailOrPassAlert && "Email and password cannot be empty. Please fill them to continue."}
              {showEmptyEmailOrPassAlert && "Email and password cannot be empty. Please fill them to continue."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    
  )
}