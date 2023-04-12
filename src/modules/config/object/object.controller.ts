import { Body, Controller, Post } from "danet/mod.ts";
import { Tag } from "danetSwagger/decorators.ts";
import { ConfigObjectClearDTO, ConfigObjectCountDTO, ConfigObjectGetDTO, ConfigObjectRemoveDTO, ConfigObjectSetDTO } from "/modules/config/object/object.interface.ts";
import { ObjectService } from "/modules/config/object/object.service.ts";

@Tag("Config")
@Controller("config/object")
export class ObjectController {

  constructor(private object: ObjectService) {}

  /**
   * Get a config object
   * @param {ConfigObjectGetDTO} body
   * @returns {string | boolean}
   */
  @Post("get")
  public getConfig(@Body() body: ConfigObjectGetDTO) {
    return this.object.getObject(body.group, body.object);
  }

  /**
   * Set a config object
   * @param {ConfigObjectSetDTO} body
   * @returns {boolean}
   */
  @Post("set")
  public setConfig(@Body() body: ConfigObjectSetDTO) {
    return this.object.setObject(body.group, body.object, body.data);
  }

  /**
   * Remove a config object
   * @param {ConfigObjectRemoveDTO} body
   * @returns {boolean}
   */
  @Post("remove")
  public removeConfig(@Body() body: ConfigObjectRemoveDTO) {
    return this.object.removeObject(body.group, body.object);
  }

  /**
   * Clear all config objects for a group
   * @param {ConfigObjectClearDTO} body
   * @returns {boolean}
   */
  @Post("clear")
  public clearConfig(@Body() body: ConfigObjectClearDTO) {
    return this.object.clearObjects(body.group);
  }

  /**
   * Count all config objects for a group
   * @param {ConfigObjectCountDTO} body
   * @returns {number}
   */
  @Post("count")
  public countConfig(@Body() body: ConfigObjectCountDTO) {
    return this.object.countObjects(body.group);
  }

}
