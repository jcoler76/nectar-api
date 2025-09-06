# Large Files Refactoring Plan

## Executive Summary
We have identified 50+ files over 500 lines, with the largest being 1,056 lines. These files impact maintainability and quality scores. This plan provides a systematic approach to refactor them without disrupting functionality.

## Current Status
- **Total Large Files**: ~50 files over 500 lines
- **Largest File**: ActivityLogsReport.jsx (1,056 lines)
- **Impact on Score**: -20 points on complexity score
- **Estimated Effort**: 40-60 hours total

## Priority Ranking System
Files are prioritized based on:
1. **Size** - Larger files first
2. **Complexity** - Business logic density
3. **Usage** - How frequently modified
4. **Risk** - Impact if broken

## Phase 1: Critical Components (Week 1-2)
### High Priority - Top 5 Largest Files

#### 1. **ActivityLogsReport.jsx** (1,056 lines)
**Current Issues:**
- Combines data fetching, filtering, display, and export logic
- Multiple inline component definitions
- Complex state management

**Refactoring Strategy:**
```
ActivityLogsReport.jsx (200 lines)
├── hooks/
│   ├── useActivityLogs.js (150 lines) - Data fetching & state
│   ├── useActivityFilters.js (100 lines) - Filter logic
│   └── useActivityExport.js (80 lines) - Export functionality
├── components/
│   ├── ActivityLogTable.jsx (150 lines) - Table display
│   ├── ActivityLogFilters.jsx (120 lines) - Filter UI
│   ├── ActivityLogStats.jsx (100 lines) - Statistics cards
│   └── ActivityLogPagination.jsx (80 lines) - Pagination
└── utils/
    └── activityLogHelpers.js (76 lines) - Utility functions
```

**Implementation Steps:**
1. Extract custom hooks for data management
2. Create sub-components for each UI section
3. Move utility functions to helpers
4. Add proper TypeScript types
5. Test thoroughly after each extraction

---

#### 2. **WorkflowBuilder.jsx** (865 lines)
**Current Issues:**
- Complex React Flow integration
- Node management logic mixed with UI
- Event handlers throughout

**Refactoring Strategy:**
```
WorkflowBuilder.jsx (200 lines)
├── hooks/
│   ├── useWorkflowNodes.js (120 lines) - Node state management
│   ├── useWorkflowEdges.js (100 lines) - Edge management
│   └── useWorkflowLayout.js (80 lines) - Auto-layout logic
├── components/
│   ├── WorkflowCanvas.jsx (150 lines) - Main canvas
│   ├── WorkflowToolbar.jsx (100 lines) - Toolbar actions
│   └── WorkflowSidebar.jsx (115 lines) - Node palette
└── utils/
    ├── workflowValidation.js (50 lines)
    └── workflowSerialization.js (50 lines)
```

---

#### 3. **AIGenerationManager.jsx** (858 lines)
**Current Issues:**
- Multiple AI generation strategies in one file
- Complex form handling
- Mixed concerns (UI + business logic)

**Refactoring Strategy:**
```
AIGenerationManager.jsx (150 lines)
├── hooks/
│   ├── useAIGeneration.js (100 lines) - Generation logic
│   └── useGenerationHistory.js (80 lines) - History management
├── components/
│   ├── GenerationForm.jsx (150 lines) - Input form
│   ├── GenerationPreview.jsx (120 lines) - Preview panel
│   ├── GenerationHistory.jsx (100 lines) - History list
│   └── GenerationTemplates.jsx (108 lines) - Template selector
└── services/
    └── aiGenerationStrategies.js (100 lines) - Strategy patterns
```

---

#### 4. **RateLimitAnalytics.jsx** (823 lines)
**Current Issues:**
- Chart logic mixed with data processing
- Multiple visualization types in one component
- Heavy calculations in render

**Refactoring Strategy:**
```
RateLimitAnalytics.jsx (150 lines)
├── hooks/
│   ├── useRateLimitMetrics.js (100 lines) - Metrics fetching
│   └── useRateLimitCalculations.js (120 lines) - Calculations
├── components/
│   ├── RateLimitChart.jsx (150 lines) - Main chart
│   ├── RateLimitHeatmap.jsx (120 lines) - Heatmap view
│   ├── RateLimitSummary.jsx (100 lines) - Summary cards
│   └── RateLimitAlerts.jsx (83 lines) - Alert display
└── utils/
    └── rateLimitFormatters.js (50 lines) - Data formatters
```

---

#### 5. **RateLimitForm.jsx** (820 lines)
**Current Issues:**
- Complex form validation
- Multiple configuration sections
- Nested conditional rendering

**Refactoring Strategy:**
```
RateLimitForm.jsx (150 lines)
├── hooks/
│   ├── useRateLimitForm.js (120 lines) - Form state
│   └── useRateLimitValidation.js (100 lines) - Validation
├── components/
│   ├── BasicConfiguration.jsx (120 lines) - Basic settings
│   ├── AdvancedConfiguration.jsx (150 lines) - Advanced options
│   ├── RuleBuilder.jsx (130 lines) - Rule configuration
│   └── PreviewPanel.jsx (100 lines) - Config preview
└── schemas/
    └── rateLimitSchema.js (50 lines) - Validation schemas
```

## Phase 2: Business Logic Components (Week 3-4)
### Medium Priority - Complex Business Logic

#### 6. **BusinessIntelligenceChat.jsx** (794 lines)
- Extract chat history management
- Separate message rendering components
- Create query processing hooks

#### 7. **DatabaseTriggerPanel.jsx** (782 lines)
- Split database selection from trigger configuration
- Extract polling logic to custom hook
- Create reusable field mapping component

#### 8. **businessIntelligenceService.js** (741 lines)
- Apply service layer pattern
- Separate query builders
- Extract response transformers

## Phase 3: Supporting Components (Week 5-6)
### Lower Priority - Stable Components

#### 9. **api.ts** (634 lines)
- Already well-structured, minor optimizations only
- Consider splitting interceptors

#### 10. **ServiceObjectManager.jsx** (605 lines)
- Extract object type handlers
- Create reusable CRUD components

## Implementation Guidelines

### 1. **Refactoring Rules**
- ✅ One file at a time
- ✅ Maintain all existing functionality
- ✅ Add tests before refactoring
- ✅ Keep git commits atomic
- ✅ Update imports incrementally

### 2. **Quality Checklist per File**
- [ ] File under 300 lines
- [ ] Single responsibility principle
- [ ] Proper TypeScript types (if applicable)
- [ ] Custom hooks extracted
- [ ] Sub-components created
- [ ] Utilities separated
- [ ] Tests passing
- [ ] No performance regression

### 3. **Testing Strategy**
```bash
# Before refactoring
npm test -- --coverage ActivityLogsReport

# After each extraction
npm test -- --coverage ActivityLogsReport

# Integration test
npm run test:integration
```

### 4. **Progress Tracking**
```markdown
## Week 1 Progress
- [ ] ActivityLogsReport.jsx - Broken into 8 files
- [ ] WorkflowBuilder.jsx - Broken into 7 files
- [ ] Tests passing
- [ ] Code review completed
```

## Expected Outcomes

### Quality Score Improvements
- **Complexity Score**: +25 points (from 45 to 70)
- **Maintainability**: +10 points
- **Overall Score**: +15 points (from B- 77 to B+ 92)

### Development Benefits
- 🚀 **Faster development** - Easier to find and modify code
- 🐛 **Fewer bugs** - Smaller, focused components
- 👥 **Better collaboration** - Multiple devs can work on different parts
- 📚 **Improved testability** - Isolated units are easier to test
- 🔍 **Enhanced debugging** - Smaller stack traces

### Performance Benefits
- ⚡ **Better code splitting** - Smaller chunks
- 🎯 **Targeted optimization** - Profile individual components
- 💾 **Reduced memory usage** - More efficient renders

## Risk Mitigation

### Potential Risks
1. **Breaking existing functionality**
   - Mitigation: Comprehensive tests before refactoring
   
2. **Import path changes breaking other components**
   - Mitigation: Use find/replace, update incrementally
   
3. **Performance regression from over-componentization**
   - Mitigation: Profile before/after, use React.memo wisely

4. **Lost business logic during extraction**
   - Mitigation: Code review, maintain detailed comments

## Automation Support

### Scripts to Help
```bash
# Check file sizes
npm run quality:analyze

# Find large files
find src -name "*.jsx" -o -name "*.js" | xargs wc -l | sort -rn | head -20

# Test coverage for specific component
npm test -- --coverage --collectCoverageFrom=src/components/reports/ActivityLogsReport.jsx
```

## Success Metrics
- ✅ No files over 500 lines
- ✅ Average file size under 200 lines
- ✅ Quality score over 85
- ✅ All tests passing
- ✅ No performance regression
- ✅ Positive developer feedback

## Next Steps
1. **Week 1**: Start with ActivityLogsReport.jsx
2. **Daily**: Refactor one major section
3. **End of each file**: Run tests and quality check
4. **Weekly**: Review progress and adjust plan

## Conclusion
This systematic approach will improve code quality without disrupting development. Each refactoring is reversible, testable, and provides immediate benefits. The modular approach allows pausing at any point while maintaining a working application.