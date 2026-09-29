// ==============================|| PRESET THEME - FEMA AI ||============================== //

// Femmi brand teal, sampled from the shield logo (assets/logo.jpeg): #014140 core.
const femaPink = {
  0: '#EAF3F1',
  1: '#D3E7E3',
  2: '#A8CFC7',
  3: '#6EAEA2',
  4: '#3D8B7E',
  5: '#0B3D3B',
  6: '#012E2D',
  7: '#01201F',
  8: '#011615',
  9: '#000C0B'
};

export default function Default(colors) {
  const { red, gold, cyan, green, grey } = colors;
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
      lighter: '#EAF3F1',
      100: '#EAF3F1',
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
    warning: {
      lighter: gold[0],
      light: gold[3],
      main: gold[5],
      dark: gold[7],
      darker: gold[9],
      contrastText: greyColors[100]
    },
    info: {
      lighter: cyan[0],
      light: cyan[3],
      main: cyan[5],
      dark: cyan[7],
      darker: cyan[9],
      contrastText
    },
    success: {
      lighter: green[0],
      light: green[3],
      main: green[5],
      dark: green[7],
      darker: green[9],
      contrastText
    },
    grey: greyColors
  };
}
