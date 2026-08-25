import PropTypes from 'prop-types';

// material-ui
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';

// assets
import SearchOutlined from '@ant-design/icons/SearchOutlined';

// ==============================|| DATA TABLE TOOLBAR ||============================== //

export default function DataTableToolbar({ search, onSearchChange, searchPlaceholder = 'Search…', filters = [], endContent }) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      sx={{ gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 2 }}
    >
      <TextField
        size="small"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        sx={{ minWidth: { xs: '100%', md: 280 } }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined />
              </InputAdornment>
            )
          }
        }}
      />
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {filters.map((filter) => (
          <FormControl key={filter.key} size="small" sx={{ minWidth: 140 }}>
            <InputLabel id={`${filter.key}-label`}>{filter.label}</InputLabel>
            <Select
              labelId={`${filter.key}-label`}
              label={filter.label}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              {filter.options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
        {endContent && <Box>{endContent}</Box>}
      </Stack>
    </Stack>
  );
}

DataTableToolbar.propTypes = {
  search: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  filters: PropTypes.array,
  endContent: PropTypes.node
};
