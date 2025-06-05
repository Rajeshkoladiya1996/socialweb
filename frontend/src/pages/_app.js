import { AuthProvider } from "../../utils/auth";
import Layout from "../../components/Layout";
import "../pages/styles/globals.css";

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;
