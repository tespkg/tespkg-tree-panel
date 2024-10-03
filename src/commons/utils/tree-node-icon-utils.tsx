import {CONTINENTS} from 'commons/constants/continent-names'
import {TreeNodeData} from 'commons/types/TreeNodeData'
import {TREE_NODE_DATA_TYPES} from 'commons/constants/tree-node-data-types'
import {OPERATION_TYPES} from 'commons/constants/operation-types'
import {COUNTRIES} from 'commons/constants/country-codes'
import TreeNodeIcon from 'components/tree-node-icon/TreeNodeIcon'
import {stringToUpperUnderscored} from './string-utils'
import React from 'react'
import * as Constants from 'commons/constants/tree-node-icon-constants'

export const getTreeNodeIcon = (data: TreeNodeData) => {
  const svgPath = getTreeNodeSvgPath(data) ?? Constants.UNKNOWN_SVG_PATH
  return <TreeNodeIcon svgPath={svgPath}/>
}

const getTreeNodeSvgPath = (data: TreeNodeData): string | undefined => {
  if (data && data.type) {
    const type = data.type
    if (type.includes(TREE_NODE_DATA_TYPES.COMPANY)) {
      return Constants.COMPANY_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.OPERATED)) {
      return getOperatedTreeNodeIcon(data.name)
    } else if (type.includes(TREE_NODE_DATA_TYPES.CONTINENT)) {
      return getContinentTreeNodeIcon(data.name)
    } else if (type.includes(TREE_NODE_DATA_TYPES.COUNTRY)) {
      return getCountryTreeNodeIcon(data.name)
    } else if (type.includes(TREE_NODE_DATA_TYPES.BLOCK)) {
      return Constants.BLOCK_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.COMPLETION)) {
      return Constants.COMPLETION_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.FIELD)) {
      return Constants.FIELD_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.REGION)) {
      return Constants.REGION_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.RESERVOIR)) {
      return Constants.RESERVOIR_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.STATION)) {
      return Constants.STATION_SVG_PATH
    } else if (type.includes(TREE_NODE_DATA_TYPES.WELL)) {
      return Constants.WELL_SVG_PATH
    }
  }
  return undefined
}

const getOperatedTreeNodeIcon = (name: string): string | undefined => {
  switch (name?.toLowerCase()) {
    case OPERATION_TYPES.OPERATED:
      return Constants.OPERATED_SVG_PATH
    case OPERATION_TYPES.NOT_OPERATED:
      return Constants.NOT_OPERATED_SVG_PATH
  }
  return undefined
}

const getCountryCode = (countryName: string): string | undefined => {
  const countryNameKey = stringToUpperUnderscored(countryName)
  const country = Object.entries(COUNTRIES).find(([key, _]) => key === countryNameKey)
  return country?.[1].toString()
}

const getCountryTreeNodeIcon = (countryName: string): string | undefined => {
  const countryCode = getCountryCode(countryName)
  return `${Constants.BASE_IMAGE_PATH}country/${countryCode}.svg` ?? Constants.UNKNOWN_COUNTRY_SVG_PATH
}

const getContinentTreeNodeIcon = (continentName: string): string | undefined => {
  switch (continentName?.toLowerCase()) {
    case CONTINENTS.ASIA:
      return Constants.ASIA_SVG_PATH
    case CONTINENTS.AFRICA:
      return Constants.AFRICA_SVG_PATH
    case CONTINENTS.AUSTRALIA:
      return Constants.AUSTRALIA_SVG_PATH
    case CONTINENTS.EUROPE:
      return Constants.EUROPE_SVG_PATH
    case CONTINENTS.NORTH_AMERICA:
      return Constants.NORTH_AMERICA_SVG_PATH
    case CONTINENTS.SOUTH_AMERICA:
      return Constants.SOUTH_AMERICA_SVG_PATH
  }
  return undefined
}
