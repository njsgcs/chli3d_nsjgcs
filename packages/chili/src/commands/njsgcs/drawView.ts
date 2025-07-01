import { command, IApplication, ICommand, Logger } from "chili-core";
// 定义类并实现 ICommand 接口
@command({
    name: "njsgcs_drawview",
    display: "njsgcs_drawview", // 替换为合法的枚举值或扩展枚举
    icon: "njsgcs_drawview",
})
export class drawView implements ICommand {
    // 实现 execute 方法
    async execute(app: IApplication): Promise<void> {
        Logger.info("njsqcs.test!!!!!!!!!!!!!!!");

    }
}
