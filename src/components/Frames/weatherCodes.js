export function weatherInfo(code) {
  if (code === 0) return { label: 'Clear sky', icon: '☀', type: 'sun' }
  if (code === 1 || code === 2) return { label: 'Partly cloudy', icon: '◐', type: 'cloud' }
  if (code === 3) return { label: 'Overcast', icon: '☁', type: 'cloud' }
  if ([45, 48].includes(code)) return { label: 'Fog', icon: '≋', type: 'fog' }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', icon: '☂', type: 'rain' }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: '❄', type: 'snow' }
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: 'ϟ', type: 'storm' }
  return { label: 'Weather update', icon: '◌', type: 'generic' }
}
