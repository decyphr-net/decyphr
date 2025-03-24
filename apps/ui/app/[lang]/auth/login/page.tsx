import AuthServer from "../../../../components/auth/AuthServer";
import { Locale } from "../../../i18n/config";

export default function AuthPage({ params: { lang } }: { params: { lang: Locale } }) {
  return <AuthServer lang={lang} />;
}