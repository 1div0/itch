
import {ITabData} from "../types/db";

interface IBaseTabData extends ITabData {
  id?: string;
}

interface IBaseTabDataSet {
  [key: string]: IBaseTabData;
  featured: IBaseTabData;
  dashboard: IBaseTabData;
  collections: IBaseTabData;
  library: IBaseTabData;
  preferences: IBaseTabData;
  history: IBaseTabData;
  downloads: IBaseTabData;
}

const baseData = {
  featured: { label: "itch.io", subtitle: ["sidebar.itchio"] },
  dashboard: { label: ["sidebar.dashboard"], subtitle: ["sidebar.dashboard_subtitle"] },
  collections: { label: ["sidebar.collections"] },
  library: { label: ["sidebar.owned"], subtitle: ["sidebar.owned_subtitle"] },
  preferences: { label: ["sidebar.preferences"] },
  history: { label: ["sidebar.history"] },
  downloads: { label: ["sidebar.downloads"] },
} as IBaseTabDataSet;

for (const key of Object.keys(baseData)) {
  baseData[key].id = key;
  baseData[key].path = key;
}

export default baseData;
