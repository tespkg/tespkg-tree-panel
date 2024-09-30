import { css, cx } from '@emotion/css'
import { PanelProps } from '@grafana/data'
import { locationService } from '@grafana/runtime'
import { Alert, useStyles2 } from '@grafana/ui'
import { MatchSearch } from 'commons/enums/MatchSearch'
import { TreeNodeData } from 'commons/types/TreeNodeData'
import { setGrafanaVariable } from 'commons/utils/grafana-variable-utils'
import GrafanaVariableAlert from 'commons/utils/GrafanaVariableAlert'
import * as Handlebars from 'handlebars'
import * as React from 'react'
import { TreeOptions } from 'types'
import HorizontalSeparator from './horizontal-separator/HorizontalSeparator'
import { SearchBox } from './search-box/SearchBox'
import SettingsPopup from './settings-popup/SettingsPopup'
import './style.css'
import Toolbar from './toolbar/TreeToolbar'
import TreeView from './tree-view/TreeView'

// let renderCount = 0

interface Props extends PanelProps<TreeOptions> {}
type NodeSelection = { [key: string]: string[] }

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Roboto, Helvetica, Arial, sans-serif;
      position: relative;
    `,
  }
}
export const defaultFormatTemplate = `{{~#each .}}{{#if @index}} OR {{/if}}
{{~@key}} in ({{#each .}}{{~#if @index}},{{/if}}{{~id}}{{~/each}})
{{~/each}}`

const getSearchParam = (variableName: string) => locationService.getSearch().get(`var-${variableName}`) ?? ''

export const TreePanel: React.FC<Props> = ({ options, data, width, height, replaceVariables }) => {
  const styles = useStyles2(getStyles)
  const { field, variableName, firstFourLevelsSortingVariableName, treeFiltersVariableName, defaultExpansionLevel } =
    options

  const rows = data.series
    .map((d) => d.fields.find((f) => f.name === field))
    .map((f) => f?.values)
    .at(-1)
    ?.toArray()

  let formatTemplate = defaultFormatTemplate
  if (options.formatQuery) {
    formatTemplate = options.formatQuery
  }

  const mounted = React.useRef(false)

  // So we can't use getSearchParam(variableName) in initial state as the url state is not yet set
  const [queryVar, setQueryVar] = React.useState(() => {
    const searchParamVar = getSearchParam(variableName).trim()
    // console.log('searchParamVar', searchParamVar)
    // console.log('replaceVariablesVar', replaceVariables(`$${variableName}`).trim()) // surprise! this lags behind the url state...
    if (searchParamVar === '') {
      return replaceVariables(`$${variableName}`).trim()
    }
    return searchParamVar
  })
  // we probably want to use useSyncExternalStore as the following is considered an antipattern
  // https://react.dev/learn/you-might-not-need-an-effect#subscribing-to-an-external-store
  // only in react 18
  React.useEffect(() => {
    const history = locationService.getHistory()
    const unlisten = history.listen(() => {
      // const queryVar = replaceVariables(`$${variableName}`).trim()
      // console.log('queryVar', queryVar) // surprise! this lags behind the url state...
      setQueryVar(getSearchParam(variableName))
      // const rv = replaceVariables(`$${variableName}`).trim()
      // console.log('rv in history', rv)
      // console.log('queryVar in history', getSearchParam(variableName))
    })
    return unlisten
  }, [replaceVariables, variableName])

  const selected = parseSelected(queryVar === options.defaultValue ? '' : queryVar)
  // console.log('selected', selected)

  // filter selection with search
  const [showSelected, setShowSelected] = React.useState(false)
  const [searchText, setSearchText] = React.useState('')
  const [showChildrenNodes, setShowChildrenNodes] = React.useState<NodeSelection>({})

  let tree: TreeNodeData[] = []
  let dataError: React.ReactNode | undefined
  try {
    tree = transformData(
      rows ?? [],
      defaultExpansionLevel,
      selected,
      showSelected,
      searchText,
      showChildrenNodes,
      mounted.current
    )
  } catch (e) {
    dataError = (
      <Alert title={`Invalid data format in "${options.field}" column`}>
        Accepted data format are comma separated strings. Possible format of the strings:
        <ul>
          <li>id,id,id,...</li>
          <li>id:name,id:name,id:name,...</li>
          <li>id:name:type,id:name:type,id:name:type,...</li>
        </ul>
      </Alert>
    )
  }

  // aid initially show selected items: we want to show selected nodes and
  // their parents here we collect all the nodes that have showChildren set to
  // true from `transformData`
  React.useEffect(() => {
    mounted.current = true
    // collect all showChildren nodes
    const showNodes: NodeSelection = {}
    let walk = (node: TreeNodeData) => {
      if (node.showChildren) {
        if (!showNodes[node.type]) {
          showNodes[node.type] = []
        }
        showNodes[node.type].push(node.id)
      }
      node.children?.forEach(walk)
    }
    walk({ id: '', name: '', type: '', children: tree })
    setShowChildrenNodes(showNodes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // console.log(renderCount++)

  const handleToggleNode = (node: TreeNodeData) => {
    const nodeType = node.type!!
    const current = showChildrenNodes[nodeType]
    if (!current || !current.includes(node.id)) {
      const selected = current || []
      setShowChildrenNodes({ ...showChildrenNodes, [nodeType]: [...selected, node.id] })
    } else {
      setShowChildrenNodes({ ...showChildrenNodes, [nodeType]: current.filter((id) => id !== node.id) })
    }
  }

  const handleExpandAll = (expand: boolean) => {
    if (!expand) {
      setShowChildrenNodes({})
    } else {
      const showNodes: NodeSelection = {}
      const walk = (node: TreeNodeData) => {
        if (!showNodes[node.type]) {
          showNodes[node.type] = []
        }
        showNodes[node.type].push(node.id)
        node.children?.forEach(walk)
      }
      walk({ id: '', name: '', type: '', children: tree })
      setShowChildrenNodes(showNodes)
    }
  }

  const [formatTpl, formatTplError] = React.useMemo(() => {
    let error: React.ReactNode
    let fmt = formatTemplate
    try {
      Handlebars.parse(formatTemplate)
    } catch (e: any) {
      if (e.message) {
        error = (
          <Alert title="Incorrect format query">
            <pre>{e.message}</pre>
          </Alert>
        )
      }
      fmt = defaultFormatTemplate
    }
    return [Handlebars.compile(fmt), error]
  }, [formatTemplate])

  const handleSelectNode = (node: TreeNodeData) => {
    // exclusive selection: all parent & children needs to be deselected
    const thisNode = node
    thisNode.selected = !node.selected
    if (thisNode.selected) {
      // unselect all parent
      while (node?.parent) {
        node = node.parent
        if (node?.selected) {
          node.selected = false
        }
      }
      // unselect all children
      const walk = (node: TreeNodeData) => {
        node.selected = false
        node.children?.forEach(walk)
      }
      thisNode.children?.forEach(walk)
    }

    // walk all selected nodes and update query
    const selected: TreeNodeData[] = []
    const walk = (node: TreeNodeData) => {
      if (node.selected) {
        selected.push(node)
      }
      node.children?.forEach(walk)
    }
    walk({ id: '', name: '', type: '', children: tree })

    const entities: { [type: string]: object[] } = {}

    selected.forEach((node) => {
      const type = node.type ?? ''
      if (!entities[type]) {
        entities[type] = []
      }
      entities[type].push({ id: node.id, name: node.name, type: node.type })
    })
    let query = formatTpl(entities)
    if (query === '') {
      query = options.defaultValue
    }
    if (queryVar !== query) {
      if (options.debug) {
        console.log(`setting variable ${variableName}`, query)
      }
      setGrafanaVariable(variableName, query)
    }
  }

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
          padding: 4px;
        `
      )}
    >
      <GrafanaVariableAlert variableName={variableName} />
      <GrafanaVariableAlert variableName={firstFourLevelsSortingVariableName} />
      <GrafanaVariableAlert variableName={treeFiltersVariableName} />
      {formatTplError}
      {dataError}
      <Toolbar>
        <SearchBox onDebouncedChange={setSearchText} />
        <SettingsPopup
          firstFourLevelsSortingVariableName={firstFourLevelsSortingVariableName}
          treeFiltersVariableName={treeFiltersVariableName}
          onExpandAll={() => handleExpandAll(true)}
          onCollapseAll={() => handleExpandAll(false)}
          showSelected={showSelected}
          onShowSelectedChange={() => setShowSelected((prev) => !prev)}
        />
      </Toolbar>
      <HorizontalSeparator />
      <TreeView items={tree} onToggleNode={handleToggleNode} onSelectNode={handleSelectNode} />
    </div>
  )
}

// match "type in (id1,id2,id3)" where "type" is group 1 and "id1,id2,id3" is group 2
const queryRE = new RegExp(/(\w+)\s+in\s+\(([\w|\W]+)\)/)

// TODO(jackieli): only works with default template...
function parseSelected(query: string): { [type: string]: string[] } {
  query = query.replace(/["']/g, '')
  if (!query.trim()) {
    return {}
  }
  const items = query.split(' OR ')
  return items.reduce((acc, item) => {
    const match = item.match(queryRE)
    if (!match) {
      console.error(`Incorrect query format: ${item}`)
      return acc
    }
    const entity = match[1]
    const ids = match[2].split(',')
    acc[entity] = ids
    return acc
  }, {} as { [type: string]: string[] })
}

function transformData(
  rows: string[],
  defaultExpansionLevel: number,
  selected: NodeSelection,
  showSelected: boolean,
  debouncedSearchText: string,
  showNodes: NodeSelection,
  firstRenderCompleted: boolean
): TreeNodeData[] {
  // splits each row into items
  const table = rows.map((row) =>
    row.split(',').map((column) => {
      const parts = column.split(':')
      // default we suppose id,id,id,... format
      const item: TreeNodeData = {
        id: parts[0],
        name: parts[0],
        type: parts[0],
      }
      // let's check if we have id:name,id:name,id:name,... format
      if (parts.length > 1) {
        item.name = parts[1]
      }
      // let's check if we have id:name:type,id:name:type,id:name:type,... format
      if (parts.length > 2) {
        item.type = parts[2]
      }
      return item
    })
  )

  const rootItems: TreeNodeData[] = []
  let items: TreeNodeData[] = rootItems
  const selectedNodes: TreeNodeData[] = []
  const w = debouncedSearchText.replace(/[.+^${}()|[\]\\]/g, '\\$&') // regexp escape
  const re = new RegExp(w.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i')

  for (let i = 0; i < table.length; i++) {
    const row = table[i]
    for (let j = 0; j < row.length; j++) {
      const item = row[j]
      if (j === 0) {
        items = rootItems
      } else {
        // find parent level
        const parent = items.find((i) => i.id === row[j - 1].id) ?? throwExpression('parent not found')
        if (!parent.children) {
          parent.children = []
        }
        items = parent.children
        item.parent = parent
      }
      // if we already have an element with the same id, we skip it, avoiding duplicated items
      if (items.findIndex((it) => it.id === item.id) >= 0) {
        continue
      }

      items.push(item)

      if (selected[item.type!!] && selected[item.type!!].includes(item.id)) {
        item.selected = true
        selectedNodes.push(item)
      }

      if (showNodes[item.type!!] && showNodes[item.type!!].includes(item.id)) {
        item.showChildren = true
      }

      if (!debouncedSearchText) {
        item.matchSearch = undefined
      } else if (re.test(item.name)) {
        item.matchSearch = MatchSearch.match
        let v = item
        while (v.parent) {
          v = v.parent
          v.matchSearch = MatchSearch.childMatch
        }
      } else {
        item.matchSearch = MatchSearch.notMatch
      }
    }
  }

  let walk: (node: TreeNodeData) => void

  if (!firstRenderCompleted) {
    // Make sure selected nodes are visible.
    // Here we're making a comprimise: We want to show the user the nodes
    // that'are selected to be visible, but if we use "compute everything when
    // state changes", there is no easy way to collapse all or just collapse
    // any node that has decendent selected
    let walk = (node: TreeNodeData, lvl: number) => {
      if (lvl < defaultExpansionLevel) {
        // console.log(lvl, defaultExpansionLevel, node.name)
        node.showChildren = true
      }

      if (selectedNodes.map((n) => n.id).includes(node.id)) {
        let v = node
        while (v.parent) {
          v.parent.showChildren = true
          v = v.parent
        }
      }
      node.children?.forEach((v) => walk(v, lvl + 1))
    }
    walk({ id: '', name: '', type: '', children: rootItems }, 0)
  }

  // if show selected, hide other items
  if (showSelected) {
    walk = (node: TreeNodeData) => {
      node.children = node.children?.filter((n) => n.selected || n.showChildren)
      node.children?.forEach(walk)
    }
    walk({ id: '', name: '', type: '', children: rootItems })
  }

  return rootItems
}

function throwExpression(errorMessage: string): never {
  throw new Error(errorMessage)
}
