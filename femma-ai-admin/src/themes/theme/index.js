// ==============================|| PRESET THEME - FEMA AI ||============================== //

// Femma AI app brand palette (Femma-AI/artifacts/unstoppable/constants/colors.ts).
// Pink scale built around primary #F26BB5 (main) and deepPink #D94A9A (dark).
const femaPink = {
  0: '#FDEDF6',
  1: '#FBD6EA',
  2: '#F8B3D8',
  3: '#F590C7',
  4: '#F37DBE',
  5: '#F26BB5',
  6: '#D94A9A',
  7: '#B8377F',
  8: '#8F2862',
  9: '#5E1A41'
};

// App accents: lavender, sky blue, mint, warm yellow, coral. `light` = the app's soft shade;
// `main` is a deeper tone of the same hue so status text/chips stay readable on white.
const lavender = { lighter: '#F4F0FE', light: '#E9E2FC', main: '#B9A7F2', dark: '#8F78DB', darker: '#6A52B8' };
const skyBlue = { lighter: '#E8F7FC', light: '#77CDED', main: '#3FA9D1', dark: '#2A7FA0', darker: '#1D5C75' };
const mint = { lighter: '#EAF8F3', light: '#A9E4D2', main: '#3FAE8C', dark: '#2E8A6E', darker: '#1F6450' };
const warmYellow = { lighter: '#FFF6E3', light: '#FFD88A', main: '#E8A23A', dark: '#B97D22', darker: '#8A5C16' };

export default function Default(colors) {
  const { grey } = colors;
  const greyColors = {
    0: grey[0],
    50: grey[1],
    100: grey[2],
    200: grey[3],
    300: grey[4],
    400: grey[5],
    500: grey[6],
    600: grey[7],
    700: grey[8],
    800: grey[9],
    900: grey[10],
    A50: grey[15],
    A100: grey[11],
    A200: grey[12],
    A400: grey[13],
    A700: grey[14],
    A800: grey[16]
  };
  const contrastText = '#fff';

  return {
    primary: {
      lighter: femaPink[0],
      100: femaPink[1],
      200: femaPink[2],
      light: femaPink[3],
      400: femaPink[4],
      main: femaPink[5],
      dark: femaPink[6],
      700: femaPink[7],
      darker: femaPink[8],
      900: femaPink[9],
      contrastText
    },
    secondary: {
      lighter: lavender.lighter,
      100: lavender.light,
      200: greyColors[200],
      light: greyColors[300],
      400: greyColors[400],
      main: greyColors[500],
      600: greyColors[600],
      dark: greyColors[700],
      800: greyColors[800],
      darker: greyColors[900],
      A100: greyColors[0],
      A200: greyColors.A400,
      A300: greyColors.A700,
      contrastText: greyColors[0]
    },
    error: {
      lighter: '#FFE8E7',
      light: '#FFB4B2',
      main: '#FF928F',
      dark: '#E06B68',
      darker: '#B84A48',
      contrastText
    },
    warning: { ...warmYellow, contrastText },
    info: { ...skyBlue, contrastText },
    success: { ...mint, contrastText },
    // Lavender accent (app `accent`), available as palette.accent
    accent: { ...lavender, contrastText },
    grey: greyColors
  };
}
