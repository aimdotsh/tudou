import Layout from '@/components/Layout';
import useSiteMetadata from '@/hooks/useSiteMetadata';

interface IframePageProps {
  url: string;
  title: string;
}

const IframePage = ({ url, title }: IframePageProps) => {
  return (
    <Layout>
      <div className="w-full h-screen" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          style={{ width: '100%', height: '100%', minHeight: '85vh', border: 'none' }}
          allowFullScreen
        />
      </div>
    </Layout>
  );
};

export default IframePage;
