import { Search as SearchIcon } from '@mui/icons-material';
import { Box, TextField, InputAdornment } from '@mui/material';

const SearchToolbar = ({ searchTerm, onSearchChange, placeholder }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
        value={searchTerm}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        variant="outlined"
        size="small"
      />
    </Box>
  );
};

export default SearchToolbar;
