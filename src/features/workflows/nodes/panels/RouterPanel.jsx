import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Paper,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import React from 'react';

const operators = [
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Does Not Equal' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
  { value: 'isGreaterThan', label: 'Greater Than' },
  { value: 'isLessThan', label: 'Less Than' },
];

const RuleEditor = ({ rule, onRuleChange, onRuleRemove }) => {
  const handleConditionChange = (condIndex, field, value) => {
    const newConditions = [...rule.conditions];
    newConditions[condIndex] = { ...newConditions[condIndex], [field]: value };
    onRuleChange({ ...rule, conditions: newConditions });
  };

  const handleAddCondition = () => {
    const newConditions = [...rule.conditions, { variable: '', operator: 'contains', value: '' }];
    onRuleChange({ ...rule, conditions: newConditions });
  };

  const handleRemoveCondition = condIndex => {
    const newConditions = [...rule.conditions];
    newConditions.splice(condIndex, 1);
    onRuleChange({ ...rule, conditions: newConditions });
  };

  const handleLogicChange = event => {
    onRuleChange({ ...rule, logic: event.target.value });
  };

  const handleNameChange = event => {
    onRuleChange({ ...rule, name: event.target.value });
  };

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TextField
          label="Rule Name / Output"
          value={rule.name}
          onChange={handleNameChange}
          variant="standard"
          fullWidth
        />
        <IconButton onClick={onRuleRemove}>
          <DeleteIcon />
        </IconButton>
      </Box>

      {rule.conditions.map((condition, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <TextField
            label="Variable"
            value={condition.variable}
            onChange={e => handleConditionChange(index, 'variable', e.target.value)}
            size="small"
            fullWidth
            placeholder="{{input.field}}"
          />
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator}
              onChange={e => handleConditionChange(index, 'operator', e.target.value)}
              label="Operator"
            >
              {operators.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Value"
            value={condition.value}
            onChange={e => handleConditionChange(index, 'value', e.target.value)}
            size="small"
            fullWidth
          />
          <IconButton onClick={() => handleRemoveCondition(index)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddCondition}>
          Add Condition
        </Button>
        {rule.conditions.length > 1 && (
          <FormControl component="fieldset">
            <RadioGroup row value={rule.logic} onChange={handleLogicChange}>
              <FormControlLabel value="and" control={<Radio size="small" />} label="AND" />
              <FormControlLabel value="or" control={<Radio size="small" />} label="OR" />
            </RadioGroup>
          </FormControl>
        )}
      </Box>
    </Paper>
  );
};

const RouterPanel = ({ nodeData, onNodeDataChange }) => {
  if (!nodeData) return null;

  const { rules = [] } = nodeData;

  const handleRuleChange = (index, newRuleData) => {
    const newRules = [...rules];
    newRules[index] = newRuleData;
    onNodeDataChange({ rules: newRules });
  };

  const handleAddRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      name: `Path ${rules.length + 1}`,
      logic: 'and',
      conditions: [{ variable: '', operator: 'equals', value: '' }],
    };
    onNodeDataChange({ rules: [...rules, newRule] });
  };

  const handleRemoveRule = index => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    onNodeDataChange({ rules: newRules });
  };

  const handleLabelChange = event => {
    onNodeDataChange({ label: event.target.value });
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Configure Router
      </Typography>
      <TextField
        label="Node Label"
        value={nodeData.label || ''}
        onChange={handleLabelChange}
        fullWidth
        margin="normal"
      />
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Routing Rules
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define rules to route the workflow to different outputs. Data that doesn&apos;t match any
        rule will go to the &quot;Fallback&quot; output.
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
        {rules.map((rule, index) => (
          <RuleEditor
            key={rule.id}
            rule={rule}
            onRuleChange={newRuleData => handleRuleChange(index, newRuleData)}
            onRuleRemove={() => handleRemoveRule(index)}
          />
        ))}
      </Box>

      <Button
        fullWidth
        startIcon={<AddIcon />}
        onClick={handleAddRule}
        sx={{ mt: 1, flexShrink: 0 }}
      >
        Add Routing Rule
      </Button>
    </Box>
  );
};

export default RouterPanel;
