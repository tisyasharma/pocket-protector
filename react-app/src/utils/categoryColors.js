const CATEGORY_COLORS = {
  'Food & Drink': { hex: '#98c1d9', dark: '#84adc5', light: '#aed1e4', text: 'text-[#98c1d9]' },
  'Shopping': { hex: '#ee6c4d', dark: '#d45e42', light: '#f28568', text: 'text-[#ee6c4d]' },
  'Entertainment': { hex: '#EDE574', dark: '#d6cf62', light: '#f3ec95', text: 'text-[#EDE574]' },
  'Transportation': { hex: '#3d5a80', dark: '#334d6e', light: '#5478a0', text: 'text-[#3d5a80]' },
  'Health': { hex: '#FF4E50', dark: '#e04345', light: '#ff7173', text: 'text-[#FF4E50]' },
  'Travel': { hex: '#FC913A', dark: '#e07e30', light: '#fdaa64', text: 'text-[#FC913A]' },
  'Services': { hex: '#e0fbfc', dark: '#c5e8ea', light: '#edfcfd', text: 'text-[#e0fbfc]', icon: '#4da8b0' },
}

const FALLBACK = { hex: '#ADB5BD', dark: '#98A0A8', light: '#C1C8CE', text: 'text-[#ADB5BD]' }

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || FALLBACK
}

export default CATEGORY_COLORS
