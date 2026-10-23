import {openDB} from 'idb';
import {parseProject,type Project} from './core';
const db=()=>openDB('video-motion-analyzer',1,{upgrade(db){db.createObjectStore('projects')}});
export async function saveProject(p:Project,video?:Blob){const d=await db();await d.put('projects',{json:JSON.stringify(p),video},'current')}
export async function restoreProject(){const d=await db();const data=await d.get('projects','current');if(!data)throw Error('保存されたプロジェクトがありません');return {project:parseProject(data.json),video:data.video as Blob|undefined}}
