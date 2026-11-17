/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiIsLoaded,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Crosshair, ExternalLink, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import {
  ADULT_CATEGORIES,
  EditionMode,
  KIDS_CATEGORIES,
  LedgerState,
  SavedLocationPin,
} from '../../types/ledger';
import { fmt, getCurrencyConfig, r2, todayStr } from '../../utils/ledgerUtils';

interface DiscoveredPlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  businessStatus?: string;
  googleMapsURI?: string;
  suggestedCategory: string;
}

interface SpendMapViewProps {
  edition: EditionMode;
  state: LedgerState;
  onPinPlace: (place: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    category: string;
    notes: string;
  }) => void;
  onRemovePinnedPlace: (id: string) => void;
  onLogExpenseAtPlace: (payload: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    category: string;
    amount: number;
    source: 'wallet' | 'saved';
    notes: string;
  }) => string | null;
}

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };

const NEARBY_PRESETS = [
  { label: 'Supermarkets', type: 'supermarket', category: 'Groceries & Dining' },
  { label: 'Banks & ATMs', type: 'bank', category: 'Other' },
  { label: 'Restaurants', type: 'restaurant', category: 'Groceries & Dining' },
  { label: 'Pharmacies', type: 'pharmacy', category: 'Healthcare' },
  { label: 'Gas & Transit', type: 'gas_station', category: 'Transportation' },
] as const;

function isGmpQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('429')
  );
}

function triggerQuotaBannerIfNeeded(err: unknown): boolean {
  if (isGmpQuotaError(err)) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    return true;
  }
  return false;
}

export const SpendMapView: React.FC<SpendMapViewProps> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isAdults = props.edition === 'adults';
  const radius = isAdults ? 'rounded-none' : 'rounded-2xl';

  if (!apiKey) {
    return (
      <div
        className={`border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 ${radius}`}
      >
        <h2 className="text-base font-bold text-neutral-950 dark:text-white">
          Interactive Spend &amp; Place Map
        </h2>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Google Maps API key is not configured in environment variables (
          <span className="font-num">VITE_GOOGLE_MAPS_API_KEY</span>). Add a valid key to enable
          interactive map search and location expense tracking.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker']} language="en" region="US">
      <SpendMapWorkspace {...props} />
    </APIProvider>
  );
};

const SpendMapWorkspace: React.FC<SpendMapViewProps> = ({
  edition,
  state,
  onPinPlace,
  onRemovePinnedPlace,
  onLogExpenseAtPlace,
}) => {
  const isAdults = edition === 'adults';
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const apiLoaded = useApiIsLoaded();
  const apiStatus = useApiLoadingStatus();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [discovered, setDiscovered] = useState<DiscoveredPlace[]>([]);
  const [selectedDiscovered, setSelectedDiscovered] = useState<DiscoveredPlace | null>(null);
  const [selectedSaved, setSelectedSaved] = useState<SavedLocationPin | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'saved' | 'search'>('all');

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

  // Quick expense logging state for selected place
  const [expAmount, setExpAmount] = useState('');
  const [expSource, setExpSource] = useState<'wallet' | 'saved'>('wallet');
  const [expCategory, setExpCategory] = useState<string>(
    isAdults ? 'Groceries & Dining' : 'Snacks & Treats'
  );
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState('');

  const cur = state.currency;
  const sym = getCurrencyConfig(cur).symbol;
  const categories = isAdults ? ADULT_CATEGORIES : KIDS_CATEGORIES;

  const boxClass = isAdults
    ? 'rounded-none border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

  const inputClass = isAdults
    ? 'w-full rounded-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

  const radius = isAdults ? 'rounded-none' : 'rounded-xl';

  // Fetch autocomplete suggestions with session token
  useEffect(() => {
    if (!placesLib || !query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        const center = map?.getCenter();
        const request: google.maps.places.AutocompleteRequest = {
          input: query.trim(),
          sessionToken: sessionTokenRef.current,
          ...(center
            ? { locationBias: { lat: center.lat(), lng: center.lng() } }
            : {}),
        };
        const res =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(res.suggestions || []);
      } catch (err) {
        if (triggerQuotaBannerIfNeeded(err)) {
          setSearchError('Google Maps API quota reached.');
        }
        setSuggestions([]);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [placesLib, query, map]);

  const selectAutocompleteSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!placesLib || !suggestion.placePrediction) return;
    setSearching(true);
    setSearchError('');
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'businessStatus',
          'googleMapsURI',
        ],
      });
      sessionTokenRef.current = null;
      setSuggestions([]);

      if (place.location) {
        const item: DiscoveredPlace = {
          placeId: place.id,
          name: place.displayName || query.trim(),
          address: place.formattedAddress || '',
          lat: place.location.lat(),
          lng: place.location.lng(),
          rating: typeof place.rating === 'number' ? place.rating : undefined,
          businessStatus: place.businessStatus ? String(place.businessStatus) : undefined,
          googleMapsURI: place.googleMapsURI || undefined,
          suggestedCategory: isAdults ? 'Groceries & Dining' : 'Snacks & Treats',
        };
        setDiscovered([item]);
        setSelectedDiscovered(item);
        setSelectedSaved(null);
        setQuery(item.name);
        map?.panTo({ lat: item.lat, lng: item.lng });
        map?.setZoom(15);
      }
    } catch (err) {
      if (triggerQuotaBannerIfNeeded(err)) {
        setSearchError('Google Maps API quota reached.');
      } else {
        setSearchError('Unable to load details for the selected place.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleTextSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placesLib || !query.trim()) return;
    setSearching(true);
    setSearchError('');
    setSuggestions([]);
    sessionTokenRef.current = null;

    try {
      const center = map?.getCenter();
      const request: google.maps.places.SearchByTextRequest = {
        textQuery: query.trim(),
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'businessStatus',
          'googleMapsURI',
        ],
        maxResultCount: 10,
        language: 'en-US',
        region: 'us',
        ...(center
          ? { locationBias: { lat: center.lat(), lng: center.lng() } }
          : {}),
      };

      const { places } = await placesLib.Place.searchByText(request);
      const mapped: DiscoveredPlace[] = (places || [])
        .filter((p) => p.location != null)
        .map((p) => ({
          placeId: p.id,
          name: p.displayName || 'Place',
          address: p.formattedAddress || '',
          lat: p.location!.lat(),
          lng: p.location!.lng(),
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          businessStatus: p.businessStatus ? String(p.businessStatus) : undefined,
          googleMapsURI: p.googleMapsURI || undefined,
          suggestedCategory: isAdults ? 'Groceries & Dining' : 'Snacks & Treats',
        }));

      setDiscovered(mapped);
      setFilterMode('all');
      if (mapped.length > 0) {
        setSelectedDiscovered(mapped[0]);
        setSelectedSaved(null);
        map?.panTo({ lat: mapped[0].lat, lng: mapped[0].lng });
        if ((map?.getZoom() ?? 12) < 13) map?.setZoom(13);
      } else {
        setSearchError('No matching places found in this area.');
      }
    } catch (err) {
      if (triggerQuotaBannerIfNeeded(err)) {
        setSearchError('Google Maps API quota reached.');
      } else {
        setSearchError('Search failed. Verify Places API (New) access.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleNearbyPreset = async (
    placeType: string,
    defaultCategory: string,
    label: string
  ) => {
    if (!placesLib) return;
    setSearching(true);
    setSearchError('');
    setSuggestions([]);

    try {
      const c = map?.getCenter();
      const center = c ? { lat: c.lat(), lng: c.lng() } : DEFAULT_CENTER;
      const { places } = await placesLib.Place.searchNearby({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'location',
          'rating',
          'businessStatus',
          'googleMapsURI',
        ],
        locationRestriction: {
          center,
          radius: 4000,
        },
        includedPrimaryTypes: [placeType],
        maxResultCount: 10,
        rankPreference: placesLib.SearchNearbyRankPreference.POPULARITY,
        language: 'en-US',
        region: 'us',
      });

      const mapped: DiscoveredPlace[] = (places || [])
        .filter((p) => p.location != null)
        .map((p) => ({
          placeId: p.id,
          name: p.displayName || label,
          address: p.formattedAddress || '',
          lat: p.location!.lat(),
          lng: p.location!.lng(),
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          businessStatus: p.businessStatus ? String(p.businessStatus) : undefined,
          googleMapsURI: p.googleMapsURI || undefined,
          suggestedCategory: defaultCategory,
        }));

      setDiscovered(mapped);
      setExpCategory(defaultCategory);
      if (mapped.length > 0) {
        setSelectedDiscovered(mapped[0]);
        setSelectedSaved(null);
        map?.panTo({ lat: mapped[0].lat, lng: mapped[0].lng });
      } else {
        setSearchError(`No nearby ${label.toLowerCase()} found within 4 km.`);
      }
    } catch (err) {
      if (triggerQuotaBannerIfNeeded(err)) {
        setSearchError('Google Maps API quota reached.');
      } else {
        setSearchError(`Could not load nearby ${label.toLowerCase()}.`);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map?.panTo(coords);
        map?.setZoom(14);
      },
      () => {
        setGeoLoading(false);
        setSearchError('Location permission denied or unavailable.');
      },
      { timeout: 8000 }
    );
  };

  const totalMappedSpend = useMemo(
    () => r2(state.pinnedPlaces.reduce((sum, p) => sum + p.totalSpent, 0)),
    [state.pinnedPlaces]
  );

  const activePlace = useMemo(() => {
    if (selectedSaved) {
      return {
        isSaved: true,
        savedId: selectedSaved.id,
        placeId: selectedSaved.placeId,
        name: selectedSaved.name,
        address: selectedSaved.address,
        lat: selectedSaved.lat,
        lng: selectedSaved.lng,
        category: selectedSaved.category,
        totalSpent: selectedSaved.totalSpent,
        visitCount: selectedSaved.visitCount,
        notes: selectedSaved.notes,
        rating: undefined as number | undefined,
        googleMapsURI: undefined as string | undefined,
      };
    }
    if (selectedDiscovered) {
      const existing = state.pinnedPlaces.find(
        (p) => p.placeId === selectedDiscovered.placeId
      );
      return {
        isSaved: Boolean(existing),
        savedId: existing?.id,
        placeId: selectedDiscovered.placeId,
        name: selectedDiscovered.name,
        address: selectedDiscovered.address,
        lat: selectedDiscovered.lat,
        lng: selectedDiscovered.lng,
        category: existing?.category || selectedDiscovered.suggestedCategory,
        totalSpent: existing?.totalSpent || 0,
        visitCount: existing?.visitCount || 0,
        notes: existing?.notes || '',
        rating: selectedDiscovered.rating,
        googleMapsURI: selectedDiscovered.googleMapsURI,
      };
    }
    return null;
  }, [selectedSaved, selectedDiscovered, state.pinnedPlaces]);

  useEffect(() => {
    if (activePlace) {
      setExpCategory(activePlace.category);
      setExpError('');
    }
  }, [activePlace?.placeId]);

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlace) return;
    setExpError('');
    const num = r2(parseFloat(expAmount));
    if (Number.isNaN(num) || num <= 0) {
      setExpError('Enter a positive amount.');
      return;
    }
    const err = onLogExpenseAtPlace({
      placeId: activePlace.placeId,
      name: activePlace.name,
      address: activePlace.address,
      lat: activePlace.lat,
      lng: activePlace.lng,
      category: expCategory,
      amount: num,
      source: expSource,
      notes: expNotes.trim(),
    });
    if (err) {
      setExpError(err);
      return;
    }
    setExpAmount('');
    setExpNotes('');
  };

  const showSavedMarkers = filterMode === 'all' || filterMode === 'saved';
  const showSearchMarkers = filterMode === 'all' || filterMode === 'search';

  const savedPlaceIds = useMemo(
    () => new Set(state.pinnedPlaces.map((p) => p.placeId)),
    [state.pinnedPlaces]
  );

  const visibleSearchResults = useMemo(
    () => discovered.filter((d) => !savedPlaceIds.has(d.placeId)),
    [discovered, savedPlaceIds]
  );

  return (
    <div className="space-y-5">
      {/* Top Search & Nearby Controls */}
      <div className={boxClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-950 dark:text-white">
              {isAdults
                ? 'Interactive Spend & Merchant Location Map'
                : 'Places & Spending Map Explorer'}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Search real merchants, ATMs, or stores, pin locations, and tag ledger expenses directly
              to places.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-num border border-neutral-200/80 px-2.5 py-1 font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
              Pinned Places: {state.pinnedPlaces.length}
            </span>
            <span className="font-num border border-neutral-200/80 px-2.5 py-1 font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white">
              Mapped Spend: {fmt(totalMappedSpend, cur)}
            </span>
          </div>
        </div>

        <form onSubmit={handleTextSearch} className="relative flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, grocery store, ATM, restaurant, or city..."
              aria-label="Search places on Google Maps"
              className={`${inputClass} pl-9`}
            />
            {suggestions.length > 0 && (
              <ul
                className={`absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto border border-neutral-200 bg-white shadow-md dark:border-neutral-700 dark:bg-neutral-900 ${radius}`}
              >
                {suggestions.map((s, idx) => (
                  <li key={s.placePrediction?.placeId || idx}>
                    <button
                      type="button"
                      onClick={() => void selectAutocompleteSuggestion(s)}
                      className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-2 text-left text-xs text-neutral-800 last:border-b-0 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      <span className="truncate">{s.placePrediction?.text.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="submit"
            disabled={searching || !apiLoaded}
            className={`border px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
              isAdults
                ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {searching ? 'Searching...' : 'Search Area'}
          </button>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading || !apiLoaded}
            className={`flex items-center gap-1.5 border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>{geoLoading ? 'Locating...' : 'Use My Location'}</span>
          </button>
        </form>

        {/* Nearby Quick Category Chips (Rectangular in Adults Edition) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Nearby:
            </span>
            {NEARBY_PRESETS.map((preset) => (
              <button
                key={preset.type}
                type="button"
                disabled={searching || !apiLoaded}
                onClick={() =>
                  void handleNearbyPreset(preset.type, preset.category, preset.label)
                }
                className={`border border-neutral-200/80 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50/60 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${
                  isAdults ? 'rounded-none' : 'rounded-full'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs">
            {(['all', 'saved', 'search'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMode(m)}
                className={`border px-2.5 py-1 font-semibold capitalize ${
                  isAdults ? 'rounded-none' : 'rounded-lg'
                } ${
                  filterMode === m
                    ? isAdults
                      ? 'border-neutral-400 bg-neutral-50 text-neutral-950 dark:border-neutral-500 dark:bg-neutral-800 dark:text-white'
                      : 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-neutral-200/80 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                }`}
              >
                {m === 'all' ? 'All Pins' : m === 'saved' ? 'Pinned Only' : 'Search Results'}
              </button>
            ))}
          </div>
        </div>

        {searchError && (
          <p className="mt-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            {searchError}
          </p>
        )}
      </div>

      {/* Main Split: Interactive Map + Place Action & Directory Panel */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Map Container (Explicit Height Required - CF2) */}
        <div
          className={`lg:col-span-7 overflow-hidden border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${
            isAdults ? 'rounded-none' : 'rounded-2xl shadow-xs'
          }`}
        >
          {apiStatus === APILoadingStatus.FAILED ||
          apiStatus === APILoadingStatus.AUTH_FAILURE ? (
            <div className="flex h-[480px] w-full flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Unable to load interactive Google Map right now.
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Check your network connection or API key quota above. Your pinned ledger places
                remain safely stored.
              </p>
            </div>
          ) : (
            <div className="h-[480px] w-full lg:h-[540px]">
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={
                  state.pinnedPlaces[0]
                    ? { lat: state.pinnedPlaces[0].lat, lng: state.pinnedPlaces[0].lng }
                    : DEFAULT_CENTER
                }
                defaultZoom={12}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {showSavedMarkers &&
                  state.pinnedPlaces.map((pin) => (
                    <SavedPinMarker
                      key={pin.id}
                      pin={pin}
                      isAdults={isAdults}
                      currency={cur}
                      isSelected={selectedSaved?.id === pin.id}
                      onSelect={() => {
                        setSelectedSaved(pin);
                        setSelectedDiscovered(null);
                      }}
                      onClose={() => setSelectedSaved(null)}
                    />
                  ))}

                {showSearchMarkers &&
                  visibleSearchResults.map((place) => (
                    <DiscoveredPlaceMarker
                      key={place.placeId}
                      place={place}
                      isAdults={isAdults}
                      isSelected={selectedDiscovered?.placeId === place.placeId}
                      onSelect={() => {
                        setSelectedDiscovered(place);
                        setSelectedSaved(null);
                      }}
                      onClose={() => setSelectedDiscovered(null)}
                    />
                  ))}
              </GoogleMap>
            </div>
          )}
        </div>

        {/* Right Side: Selected Place Action Card + Pinned Directory */}
        <div className="space-y-5 lg:col-span-5">
          {/* Selected Place Detail + Log Expense Form */}
          <div className={boxClass}>
            <div className="mb-3 border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                {activePlace ? activePlace.name : 'Select or Search a Place'}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {activePlace
                  ? activePlace.address || `${activePlace.lat.toFixed(4)}, ${activePlace.lng.toFixed(4)}`
                  : 'Click any map marker or search for a store/merchant to log expenses or pin it.'}
              </p>
            </div>

            {activePlace ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {activePlace.rating !== undefined && (
                      <span className="font-num border border-neutral-200 px-2 py-0.5 font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                        Rating: {activePlace.rating.toFixed(1)}
                      </span>
                    )}
                    {activePlace.isSaved && (
                      <span className="font-num border border-emerald-200 px-2 py-0.5 font-semibold text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                        Logged: {fmt(activePlace.totalSpent, cur)} ({activePlace.visitCount}{' '}
                        visit{activePlace.visitCount === 1 ? '' : 's'})
                      </span>
                    )}
                  </div>
                  {activePlace.googleMapsURI && (
                    <a
                      href={activePlace.googleMapsURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-neutral-700 underline hover:text-neutral-950 dark:text-neutral-300"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <form onSubmit={handleLogSubmit} className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                        Expense Amount ({sym})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        className={`font-num ${inputClass}`}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                        Funding Account
                      </label>
                      <select
                        value={expSource}
                        onChange={(e) => setExpSource(e.target.value as 'wallet' | 'saved')}
                        className={inputClass}
                      >
                        <option value="wallet">
                          {isAdults ? 'Checking' : 'My Wallet'}
                        </option>
                        <option value="saved">
                          {isAdults ? 'Reserve' : 'Piggy Bank'}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                        Category
                      </label>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value)}
                        className={inputClass}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                        Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Receipt or note"
                        value={expNotes}
                        onChange={(e) => setExpNotes(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {expError && (
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                      {expError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      className={`flex-1 border px-3 py-2 text-xs font-semibold ${
                        isAdults
                          ? 'rounded-none border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white'
                          : 'rounded-xl border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      Log Expense at Place
                    </button>
                    {!activePlace.isSaved && (
                      <button
                        type="button"
                        onClick={() =>
                          onPinPlace({
                            placeId: activePlace.placeId,
                            name: activePlace.name,
                            address: activePlace.address,
                            lat: activePlace.lat,
                            lng: activePlace.lng,
                            category: expCategory,
                            notes: expNotes.trim(),
                          })
                        }
                        className={`inline-flex items-center gap-1 border border-neutral-200/80 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${radius}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Pin Only</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <div className="py-4 text-xs text-neutral-500 dark:text-neutral-400">
                Use the search bar or nearby category buttons above to locate real merchants,
                supermarkets, or ATMs, then click a pin to record an expense or bookmark it.
              </div>
            )}
          </div>

          {/* Saved Spend Locations Directory */}
          <div className={boxClass}>
            <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-2.5 dark:border-neutral-800">
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white">
                Pinned Financial Locations
              </h3>
              <span className="font-num text-xs text-neutral-500 dark:text-neutral-400">
                {state.pinnedPlaces.length} saved
              </span>
            </div>

            {state.pinnedPlaces.length === 0 ? (
              <div className="py-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No places pinned yet. Search a location on the map and click &ldquo;Pin Only&rdquo;
                or &ldquo;Log Expense at Place&rdquo;.
              </div>
            ) : (
              <div className="max-h-[260px] divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                {state.pinnedPlaces.map((pin) => (
                  <div
                    key={pin.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSaved(pin);
                        setSelectedDiscovered(null);
                        map?.panTo({ lat: pin.lat, lng: pin.lng });
                        map?.setZoom(15);
                      }}
                      className="min-w-0 flex-1 text-left hover:opacity-80"
                    >
                      <div className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                        {pin.name}
                      </div>
                      <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        {pin.category} · {pin.lastDate || todayStr()}
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-num text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {fmt(pin.totalSpent, cur)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${pin.name}`}
                        onClick={() => {
                          if (selectedSaved?.id === pin.id) setSelectedSaved(null);
                          onRemovePinnedPlace(pin.id);
                        }}
                        className="p-1 text-neutral-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SavedPinMarkerProps {
  pin: SavedLocationPin;
  isAdults: boolean;
  currency: LedgerState['currency'];
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const SavedPinMarker: React.FC<SavedPinMarkerProps> = ({
  pin,
  isAdults,
  currency,
  isSelected,
  onSelect,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: pin.lat, lng: pin.lng }}
        title={pin.name}
        onClick={onSelect}
      >
        <div
          className={`border px-2 py-0.5 text-[11px] font-bold shadow-xs ${
            isAdults ? 'rounded-none' : 'rounded-full'
          } ${
            isSelected
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 bg-white text-neutral-900'
          }`}
        >
          <span className="font-num">
            {pin.totalSpent > 0 ? fmt(pin.totalSpent, currency) : 'Pin'}
          </span>
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={240} onCloseClick={onClose}>
          <div className="p-0.5 text-neutral-900">
            <div className="text-xs font-bold">{pin.name}</div>
            {pin.address && <div className="mt-0.5 text-[11px] text-neutral-600">{pin.address}</div>}
            <div className="font-num mt-1 text-[11px] font-semibold text-emerald-700">
              Total Logged: {fmt(pin.totalSpent, currency)} ({pin.visitCount}x)
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface DiscoveredPlaceMarkerProps {
  place: DiscoveredPlace;
  isAdults: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const DiscoveredPlaceMarker: React.FC<DiscoveredPlaceMarkerProps> = ({
  place,
  isAdults,
  isSelected,
  onSelect,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: place.lat, lng: place.lng }}
        title={place.name}
        onClick={onSelect}
      >
        <Pin
          background={isSelected ? (isAdults ? '#171717' : '#4f46e5') : '#ffffff'}
          borderColor={isAdults ? '#525252' : '#4f46e5'}
          glyphColor={isSelected ? '#ffffff' : isAdults ? '#171717' : '#4f46e5'}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={240} onCloseClick={onClose}>
          <div className="p-0.5 text-neutral-900">
            <div className="text-xs font-bold">{place.name}</div>
            {place.address && (
              <div className="mt-0.5 text-[11px] text-neutral-600">{place.address}</div>
            )}
            {place.rating !== undefined && (
              <div className="font-num mt-1 text-[11px] font-medium text-neutral-700">
                Rating: {place.rating.toFixed(1)}
              </div>
            )}
            {place.googleMapsURI && (
              <a
                href={place.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[11px] font-semibold text-blue-700 underline"
              >
                View on Google Maps
              </a>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};
