// The DB is: Company | Operated(Type) | Continent | Country
// It's one based
export const COMPANY_DATABASE_LEVEL = 1
export const TYPE_DATABASE_LEVEL = 2
export const CONTINENT_DATABASE_LEVEL = 3
export const COUNTRY_DATABASE_LEVEL = 4
// We don't need the rest
// export const REGION_DATABASE_LEVEL = 5
// ...

// Region | Block | Production Station | Field | Reservoir | Well | Completion
// It's zero based, they are indices
export const REGION_DATABASE_INDEX = 4
export const BLOCK_DATABASE_INDEX = 5
export const PRODUCTION_STATION_DATABASE_INDEX = 6
export const FIELD_DATABASE_INDEX = 7
export const RESERVOIR_DATABASE_INDEX = 8
export const WELL_DATABASE_INDEX = 9
export const COMPLETION_DATABASE_INDEX = 10
