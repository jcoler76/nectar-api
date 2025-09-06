import {
  SmartToy as BotIcon,
  BarChart as ChartIcon,
  Clear as ClearIcon,
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Send as SendIcon,
  Lightbulb as SuggestionIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grow,
  IconButton,
  InputLabel,
  List,
  ListItem,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import api from '../../services/api';
import { businessIntelligenceService } from '../../services/businessIntelligenceService';

const BusinessIntelligenceChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content:
        "👋 Hi! I'm your Business Intelligence Assistant. I can help you analyze your data with natural language questions like:\n\n• 'Show me customer acquisition trends for the past year'\n• 'What's our sales pipeline value by rep?'\n• 'Which invoices are overdue?'\n• 'Analyze contract performance by customer'\n\nWhat would you like to explore?",
      timestamp: new Date(),
      suggestions: [
        'Show me customer revenue trends',
        "What's our current sales pipeline?",
        'Which customers owe us money?',
        'Analyze proposal conversion rates',
      ],
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyAnchor, setHistoryAnchor] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('salesdemo'); // Default database
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const messagesEndRef = useRef(null);

  const formatDistanceToNow = date => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableDatabases = useCallback(async () => {
    try {
      const response = await api.post('/graphql', {
        query: `
          query GetAvailableServices {
            availableServices {
              name
              database
              host
              isActive
            }
          }
        `,
      });

      if (response.data.data?.availableServices) {
        const databases = response.data.data.availableServices
          .filter(service => service.isActive)
          .map(service => ({
            name: service.name,
            database: service.database,
            host: service.host,
            label: `${service.database} (${service.name})`,
          }));

        setAvailableDatabases(databases);

        // If current selection is not in the list, select the first available
        if (databases.length > 0 && !databases.find(db => db.name === selectedDatabase)) {
          setSelectedDatabase(databases[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading available databases:', error);
    } finally {
      setLoadingDatabases(false);
    }
  }, [selectedDatabase]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history from localStorage
    const savedHistory = localStorage.getItem('bi_chat_history');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }

    // Load available databases
    loadAvailableDatabases();
  }, [loadAvailableDatabases]);

  const saveToHistory = (question, response) => {
    const historyItem = {
      id: Date.now(),
      question,
      response: response.content,
      timestamp: new Date(),
      type: response.type || 'analysis',
      database: selectedDatabase,
    };

    const updatedHistory = [historyItem, ...chatHistory.slice(0, 9)]; // Keep last 10
    setChatHistory(updatedHistory);
    localStorage.setItem('bi_chat_history', JSON.stringify(updatedHistory));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Call the business intelligence service with selected database
      const response = await businessIntelligenceService.askBusinessQuestion(
        inputMessage,
        selectedDatabase
      );

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.content,
        timestamp: new Date(),
        data: response.data,
        queryGenerated: response.queryGenerated,
        suggestions: response.suggestions,
        responseType: response.type,
        actionableStatements: response.actionableStatements,
        safetyInfo: response.safetyInfo,
        database: selectedDatabase,
      };

      setMessages(prev => [...prev, botMessage]);
      saveToHistory(inputMessage, response);
    } catch (error) {
      console.error('Error asking business question:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content:
          'I apologize, but I encountered an error processing your question. Please try rephrasing your question or contact support if the issue persists.',
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setInputMessage('');
    }
  };

  const handleSuggestionClick = suggestion => {
    setInputMessage(suggestion);
  };

  const handleHistoryClick = historyItem => {
    setInputMessage(historyItem.question);
    // Optionally switch to the database that was used for this query
    if (historyItem.database && availableDatabases.find(db => db.name === historyItem.database)) {
      setSelectedDatabase(historyItem.database);
    }
    setHistoryAnchor(null);
  };

  const clearChat = () => {
    setMessages([messages[0]]); // Keep welcome message
  };

  const downloadData = (data, filename = 'business-data.json') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderMessage = message => {
    const isBot = message.type === 'bot';
    const isSystem = message.type === 'system';

    return (
      <Grow in={true} key={message.id}>
        <ListItem
          sx={{
            display: 'flex',
            justifyContent: isSystem ? 'center' : isBot ? 'flex-start' : 'flex-end',
            px: 2,
            py: 1,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              maxWidth: isSystem ? '70%' : '85%',
              flexDirection: isSystem ? 'column' : isBot ? 'row' : 'row-reverse',
            }}
          >
            {!isSystem && (
              <Avatar
                sx={{
                  bgcolor: isBot ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32,
                }}
              >
                {isBot ? <BotIcon /> : <PersonIcon />}
              </Avatar>
            )}

            <Paper
              sx={{
                p: isSystem ? 1 : 2,
                bgcolor: isSystem
                  ? 'info.light'
                  : isBot
                    ? message.isError
                      ? 'error.light'
                      : 'grey.100'
                    : 'primary.light',
                color: isSystem
                  ? 'info.contrastText'
                  : isBot
                    ? message.isError
                      ? 'error.contrastText'
                      : 'text.primary'
                    : 'primary.contrastText',
                borderRadius: 2,
                position: 'relative',
                textAlign: isSystem ? 'center' : 'left',
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                {message.content}
              </Typography>

              {/* Show database source for bot messages */}
              {isBot && !isSystem && message.database && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Chip
                    icon={<DatabaseIcon />}
                    label={`Source: ${availableDatabases.find(db => db.name === message.database)?.database || message.database}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
              )}

              {/* Show generated query if available */}
              {!isSystem && message.queryGenerated && (
                <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <ChartIcon fontSize="small" />
                      Generated Query
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    >
                      {message.queryGenerated}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Show data table if available */}
              {!isSystem &&
                message.data &&
                Array.isArray(message.data) &&
                message.data.length > 0 && (
                  <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <TableIcon fontSize="small" />
                          Results ({message.data.length} records)
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => downloadData(message.data, 'business-analysis.json')}
                        >
                          Download
                        </Button>
                      </Box>
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              {Object.keys(message.data[0]).map(key => (
                                <TableCell key={key}>{key}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {message.data.slice(0, 10).map((row, index) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {typeof value === 'number'
                                      ? value.toLocaleString()
                                      : value?.toString() || '--'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {message.data.length > 10 && (
                        <Typography
                          variant="caption"
                          sx={{ mt: 1, display: 'block', textAlign: 'center' }}
                        >
                          Showing first 10 of {message.data.length} records. Download for complete
                          data.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                )}

              {/* Show actionable statements if available */}
              {!isSystem &&
                message.actionableStatements &&
                message.actionableStatements.length > 0 && (
                  <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <CodeIcon fontSize="small" />
                        Actionable SQL Statements
                      </Typography>
                      {message.actionableStatements.map((statement, index) => (
                        <Accordion key={index} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={statement.type}
                                size="small"
                                color={
                                  statement.type === 'INSERT'
                                    ? 'success'
                                    : statement.type === 'UPDATE'
                                      ? 'warning'
                                      : 'error'
                                }
                              />
                              <Typography variant="body2">{statement.description}</Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  whiteSpace: 'pre-wrap',
                                }}
                              >
                                {statement.sql}
                              </Typography>
                            </Box>
                            {statement.warning && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                <AlertTitle>Important</AlertTitle>
                                {statement.warning}
                              </Alert>
                            )}
                          </AccordionDetails>
                        </Accordion>
                      ))}
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <AlertTitle>Safety Notice</AlertTitle>
                        These statements are provided for reference only and are not executed
                        automatically. Please review carefully before running in your database.
                      </Alert>
                    </CardContent>
                  </Card>
                )}

              {/* Show safety information if query was blocked */}
              {!isSystem && message.safetyInfo && (
                <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <SecurityIcon fontSize="small" />
                      Query Safety Information
                    </Typography>

                    {message.safetyInfo.actionableStatements &&
                      message.safetyInfo.actionableStatements.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Alert severity="warning" sx={{ mb: 2 }}>
                            <AlertTitle>Data Modification Detected</AlertTitle>
                            The following statements would modify data and cannot be executed
                            automatically:
                          </Alert>
                          {message.safetyInfo.actionableStatements.map((statement, index) => (
                            <Box key={index} sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Chip label={statement.type} size="small" color="warning" />
                                <Typography variant="body2">{statement.description}</Typography>
                              </Box>
                              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, ml: 2 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                >
                                  {statement.sql}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}

                    {message.safetyInfo.executableStatements &&
                      message.safetyInfo.executableStatements.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Alert severity="success" sx={{ mb: 1 }}>
                            <AlertTitle>Safe to Execute</AlertTitle>
                            These read-only statements could be executed safely:
                          </Alert>
                          {message.safetyInfo.executableStatements.map((statement, index) => (
                            <Box
                              key={index}
                              sx={{ bgcolor: 'success.light', p: 2, borderRadius: 1, mb: 1 }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                              >
                                {statement}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}

                    {message.safetyInfo.warnings && message.safetyInfo.warnings.length > 0 && (
                      <Alert severity="info">
                        <AlertTitle>Additional Notes</AlertTitle>
                        {message.safetyInfo.warnings.map((warning, index) => (
                          <Typography key={index} variant="body2" sx={{ mt: index > 0 ? 1 : 0 }}>
                            • {warning}
                          </Typography>
                        ))}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Show suggestions */}
              {!isSystem && message.suggestions && message.suggestions.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <SuggestionIcon fontSize="small" />
                    Try asking:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {message.suggestions.map((suggestion, index) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        size="small"
                        clickable
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Timestamp */}
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: isBot ? 'left' : 'right',
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                {formatDistanceToNow(message.timestamp)}
              </Typography>
            </Paper>
          </Box>
        </ListItem>
      </Grow>
    );
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <BotIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">Business Intelligence Assistant</Typography>
              <Typography variant="body2" color="text.secondary">
                Ask natural language questions about your data
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Database Selector */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="database-select-label">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatabaseIcon fontSize="small" />
                  Database
                </Box>
              </InputLabel>
              <Select
                labelId="database-select-label"
                value={selectedDatabase}
                onChange={e => {
                  const newDatabase = e.target.value;
                  const oldDatabase = selectedDatabase;
                  setSelectedDatabase(newDatabase);

                  // Add a system message when database changes
                  if (oldDatabase !== newDatabase && messages.length > 1) {
                    const dbInfo = availableDatabases.find(db => db.name === newDatabase);
                    setMessages(prev => [
                      ...prev,
                      {
                        id: Date.now(),
                        type: 'system',
                        content: `🔄 Switched to database: ${dbInfo?.database || newDatabase}\nAll future queries will use this database.`,
                        timestamp: new Date(),
                      },
                    ]);
                  }
                }}
                label="Database"
                disabled={loadingDatabases}
              >
                {loadingDatabases ? (
                  <MenuItem value="">
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Loading...
                  </MenuItem>
                ) : (
                  availableDatabases.map(db => (
                    <MenuItem key={db.name} value={db.name}>
                      <Box>
                        <Typography variant="body2">{db.database}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {db.name} @ {db.host}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Chat History">
                <IconButton
                  onClick={e => setHistoryAnchor(e.currentTarget)}
                  disabled={chatHistory.length === 0}
                >
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear Chat">
                <IconButton onClick={clearChat} disabled={messages.length <= 1}>
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Chat History Menu */}
      <Menu
        anchorEl={historyAnchor}
        open={Boolean(historyAnchor)}
        onClose={() => setHistoryAnchor(null)}
        PaperProps={{ sx: { maxHeight: 400, width: 350 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
          Recent Questions
        </Typography>
        <Divider />
        {chatHistory.map(item => (
          <MenuItem
            key={item.id}
            onClick={() => handleHistoryClick(item)}
            sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1.5 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {item.question}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(item.timestamp))}
            </Typography>
          </MenuItem>
        ))}
      </Menu>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: 1 }}>
        <List sx={{ px: 0 }}>
          {messages.map(renderMessage)}
          {loading && (
            <ListItem sx={{ justifyContent: 'center', py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Analyzing your question...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Paper sx={{ p: 2, borderRadius: 0, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder="Ask me anything about your business data..."
            variant="outlined"
            size="small"
            disabled={loading}
            onKeyPress={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || loading}
            color="primary"
            sx={{ p: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Box>

        {/* Example questions for new users */}
        {messages.length === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Example questions:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {[
                'Show me top customers by revenue',
                "What's our sales pipeline?",
                'Outstanding invoices report',
                'How to add a new customer',
                'SQL to update customer information',
              ].map((example, index) => (
                <Chip
                  key={index}
                  label={example}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => handleSuggestionClick(example)}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default BusinessIntelligenceChat;
