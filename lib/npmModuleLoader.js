/**
 * Sails.js npm module loader
 *
 * Good part of this code is get from sails.js hooks
 *
 * TODO add suport to custom grunt tasks in npm modules
 */

var _ = require('lodash'),
  util = require('sails-util'),
  buildDictionary = require('sails-build-dictionary'),
  fs = require('fs'),
  async = require('async');

module.exports = function(sails) {
  /**
   * `sails-hooks-module-loader-npm` hook
   *
   * Sails hook for loading sails features from npm packages
   */
  return {
    // Implicit default configuration
    // (mixed in to `sails.config`)
    defaults: {
      npmModules: {
        // regex for check if a package is one sails module
        // Ex.: sails-plugin-user
        packagesNameRegex: /^sails-plugin-/,
        packagesFolder: null
      }
    },

    /**
     * TODO add suport to plugin initialize functions
     *
     * @param  {Function} cb  callback
     */
    initialize: function(cb) {
      var npmModulesFolder;
      var self = this;

      if(sails.config.packagesFolder){
        npmModulesFolder = sails.config.packagesFolder;
      } else {
        npmModulesFolder = sails.config.appPath + '/node_modules';
      }

      this.getPluginsNames(npmModulesFolder, function(err, pluginsNames) {
        if(err) return cb(err);
        // todo add suport to initialize function on npm modules
        cb();
      })
    },

    pluginsNames: [],

    /**
     * TODO add suport to services, and polices in plugins
     *
     * @param  {Function} cb  callback
     */
    loadModules: function(cb) {
      var self = this;
      var npmModulesFolder;

      if(sails.config.packagesFolder){
        npmModulesFolder = sails.config.packagesFolder;
      } else {
        npmModulesFolder = sails.config.appPath + '/node_modules';
      }

      this.getPluginsNames(npmModulesFolder, function(err, pluginsNames) {
        if(err) return cb(err);
        // load sails modules in parallel
        async.parallel([
          function loadModels(doneLoadModels){
            async.each(pluginsNames, function(pluginName, next){
              // models folder inside one plugin / npm package
              var modelsFolder = npmModulesFolder + '/' + pluginName + '/api/models';
              self.loadModels(modelsFolder, function(err, models){
                if(err) return next(err);
                self.registerModels(models ,next);
              });
            }, function(err){
              doneLoadModels(err);
            })
          },
          function loadControllers(doneLoadControllers){
            async.each(pluginsNames, function(pluginName, next){
              // controller folder inside one plugin / npm package
              var controllerFolder = npmModulesFolder + '/' + pluginName + '/api/controllers';
              self.loadControllers(controllerFolder, function(err, controllers){
                if(err) return next(err);
                self.registerControllers(controllers ,next);
              })
            }, function(err){
              doneLoadControllers(err);
            })
          }
        ],
        function(err){
          return cb(err);
        });
      });

    },

    /**
     * Get plugin names from npm modules
     *
     * @param  {string}   folder path to search from npm modules
     * @param  {Function} cb     after ends it run cb(err, pluginsNames)
     */
    getPluginsNames: function getPluginsNamesFromNpms(folder, cb){
      var pluginsNames = [];
      fs.readdir(folder, function(err, files){
        for (var i = files.length - 1; i >= 0; i--) {
          // check if has a valid module name
          if( files[i].match(sails.config.npmModules.packagesNameRegex) ){
            // only suports npm packages then check if are a directory
            if (fs.statSync(folder +'/'+ files[i]).isDirectory()) {
              pluginsNames.push(files[i]);
            }
          }
        }
        cb(null, pluginsNames);
      })
    },

    /**
     * Load npm module controllers
     *
     * @param {Object} options
     * @param {Function} cb
     */
    loadControllers: function loadControllers(path, cb) {
      buildDictionary.optional({
        dirname: path,
        filter: /(.+)Controller\.(js|coffee|litcoffee)$/,
        flattenDirectories: true,
        keepDirectoryPath: true,
        replaceExpr: /Controller/
      }, cb );
    },

    /**
     * Register controllers in sails.js to allow
     *
     * @param  {object}   controllers object with controllers in its attributes
     * @param  {Function} cb          callback
     */
    registerControllers: function registerControllers(controllers ,cb) {
      sails.controllers = _.extend(sails.controllers || {}, controllers);
      // Register controllers
      _.each(controllers, function(controller, controllerId) {

        // Override whatever was here before
        if ( !util.isDictionary(sails.hooks.controllers.middleware[controllerId]) ) {
          sails.hooks.controllers.middleware[controllerId] = {};
        }

        // Mix in middleware from blueprints
        // ----removed----
        //
        // TODO: MAKE SURE THIS IS OK
        // self.middleware[controllerId].find = Controller.find;
        // self.middleware[controllerId].create = Controller.create;
        // self.middleware[controllerId].update = Controller.update;
        // self.middleware[controllerId].destroy = Controller.destroy;
        //
        // -----/removed------

        // Register this controller's actions
        _.each(controller, function(action, actionId) {
          // action ids are case insensitive
          actionId = actionId.toLowerCase();
          // If the action is set to `false`, explicitly disable it
          if (action === false) {
            delete sails.hooks.controllers.middleware[controllerId][actionId];
            return;
          }
          // Ignore non-actions (special properties)
          //
          // TODO:
          // Some of these properties are injected by `moduleloader`
          // They should be hidden in the prototype or omitted instead.
          if (_.isString(action) || _.isBoolean(action)) {
            return;
          }
          // Otherwise mix it in (this will override CRUD blueprints from above)
          action._middlewareType = 'ACTION: '+controllerId+'/'+actionId;
          sails.hooks.controllers.middleware[controllerId][actionId] = action;
          sails.hooks.controllers.explicitActions[controllerId] = sails.hooks.controllers.explicitActions[controllerId] || {};
          sails.hooks.controllers.explicitActions[controllerId][actionId] = true;
        });
      });
      return cb();
    },

    /**
     * Load npm module model definitions
     *
     * @param {Object} options
     * @param {Function} cb
     */
    loadModels: function (path, cb) {
      // Get the main model files
      buildDictionary.optional({
        dirname   : path,
        filter    : /^([^.]+)\.(js)$/,
        replaceExpr : /^.*\//,
        flattenDirectories: true
      }, function(err, models) {
        if (err) {return cb(err);}
        // Get any supplemental files
        buildDictionary.optional({
          dirname   : path,
          filter    : /(.+)\.attributes.json$/,
          replaceExpr : /^.*\//,
          flattenDirectories: true
        }, function(err, supplements) {
          if (err) {return cb(err);}
          return cb(null, sails.util.merge(models, supplements));
        });
      });
    },


    /**
     * register models on sails.js
     *
     * @param  {object}   models object with models in its attributes
     * @param  {Function} cb     callback
     */
    registerModels: function (models, cb) {
      sails.models = _.extend(sails.models || {}, models);
      cb();
    }
  }

};
