import PropTypes from 'prop-types';

const ReportLayout = ({ title, subtitle, icon: Icon, children }) => {
  return (
    <div className="flex flex-col h-full p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ocean-800 flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6" />}
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
      </div>

      {/* Content */}
      {children}
    </div>
  );
};

ReportLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.elementType,
  children: PropTypes.node.isRequired,
};

export default ReportLayout;
