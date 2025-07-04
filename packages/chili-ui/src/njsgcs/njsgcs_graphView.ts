import { PubSub } from 'chili-core';
import cytoscape from 'cytoscape';
export class njsgcs_graphview extends HTMLElement {
  override readonly shadowRoot: ShadowRoot;
  private graphContainer!: HTMLElement;
private cy: cytoscape.Core | null = null;
  constructor() {
    super();
    this.shadowRoot = this.attachShadow({ mode: 'open' });

    // 创建容器 div
    this.graphContainer = document.createElement('div');
    this.graphContainer.style.width = '100%';
    this.graphContainer.style.height = '500px';

    // 添加样式（可选）
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `;
    PubSub.default.sub("njsgcs_graphview", (elements: any[]) => {
      this.setElements(elements);
      PubSub.default.pub("expendgraphview");
  
    });
    
   
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.graphContainer);
  }
public setElements(elements: any[]) {
  if (!this.cy) {
    console.warn('Cytoscape not initialized yet.');
    return;
  }
  this.cy.json({ elements });
  this.cy.fit(); // 自动适配视口
this.cy.center();
 this.cy.layout({
 // name: 'grid', // 更直观地展示节点分布
 name: 'cose',

} ).run();

}
  connectedCallback() {
    this.initializeCytoscape();
  }

  private initializeCytoscape(elements: any[] = [
  { data: { id: 'a' } },
  { data: { id: 'b' } },
  { data: { id: 'ab', source: 'a', target: 'b' } },
]) {
    // 示例数据
  
    // 初始化 cytoscape 实例
    const cy = cytoscape({
      container: this.graphContainer, // 指定容器
      elements: elements, // 图数据
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#0074D9',
            label: 'data(id)',
          },
          
        },
         {
          selector: 'node[label = "start"]',
          style: {
            'background-color':  '#FF0000',
            label: 'data(id)',
          },
          
        },
        {
          selector: 'edge',
          style: {
            width: 3,
            
          
          },
        },
          {
      selector: "edge[type = 'arc']",
      style: {
        'line-color': '#FFD700',
      
      },
    },
      ],
     
    });
     this.cy = cy;
  }
}
// 注册自定义元素
customElements.define('njsgcs-graphview', njsgcs_graphview);