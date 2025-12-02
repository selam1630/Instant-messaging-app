declare module "otp-generator" {
  interface OTPOptions {
    upperCase?: boolean;
    specialChars?: boolean;
    digits?: boolean;
    alphabets?: boolean;
    lowerCase?: boolean;
  }

  function generate(length: number, options?: OTPOptions): string;

  export default {
    generate,
  };
}
