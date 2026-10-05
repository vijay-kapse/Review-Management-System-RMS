// ARGUS can be served at /argus or behind the RMS portal at /rms/argus.
// Work out which from the current URL so routes and public assets resolve under the right prefix.
export const getAppBasename = () => {
  if (typeof window === 'undefined') {
    return '/argus';
  }

  const argusSegment = `/${window.__ARGUS_ROUTE_SEGMENT__ || 'argus'}`;
  const argusIndex = window.location.pathname.indexOf(argusSegment);
  return argusIndex >= 0 ? window.location.pathname.slice(0, argusIndex + argusSegment.length) : argusSegment;
};

// URL for a file in public/, e.g. publicAsset('argus-mark.svg') -> /rms/argus/argus-mark.svg
export const publicAsset = (file) => `${getAppBasename()}/${file}`;
