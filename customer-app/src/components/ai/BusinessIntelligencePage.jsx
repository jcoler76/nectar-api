import BusinessIntelligenceChat from './BusinessIntelligenceChat';
import ChatErrorBoundary from './ChatErrorBoundary';

const BusinessIntelligencePage = () => {
  return (
    <ChatErrorBoundary>
      <div className="h-screen flex flex-col">
        <BusinessIntelligenceChat />
      </div>
    </ChatErrorBoundary>
  );
};

export default BusinessIntelligencePage;
