/*:
* @plugindesc Enables item crafting system.  For more information, please see the README at
* the following link: https://github.com/Geowil/LMPGames_ItemCrafting
*
* @author LMPGames
*
*
* @param Main Settings
* @default
*
*
* @param Material Requirement Mode
* @desc This setting sets how this plugin will process crafting material requirements.  For more info, see GitHub page.
* @type number
* @min 1
* @max 3
* @default 1
* @parent Main Settings
*
*
* @param Display Mode
* @desc Sets the display mode for the plugin.  For more info, see GitHub page.
* @type number
* @min 1
* @max 3
* @default 1
* @parent Main Settings
*
*
* @param Enable Name Aliasing
* @desc When Enabled, will shorten items names if they are too long to be displayed in the list window.
* @type boolean
* @default false
* @parent Main Settings
*
*
* @param Max Number of Obfuscation Characters
* @desc Sets the Max number of obfuscation characters to use in Display Mode 1
* @type number
* @min 1
* @max 10
* @default 3
* @parent Main Settings
*
*
* @param Obfuscation Character
* @desc Allows you to choose the character to use to hide data in Display Mode 1
* @type text
* @default ?
* @parent Main Settings
*
*
* @param Enable Currency Cost System
* @desc When enabled, requires currency to craft.  If turned on, cost formula in note tag is required.
* @type boolean
* @default false
* @parent Main Settings
*
*
* @param Enable Item Cost System
* @desc When enabled, requires item(s) to craft.  If turned on, item reqs note tag is required.
* @type boolean
* @default false
* @parent Main Settings
*
*
* @param Cost Settings
* @desc Settings related to the Item/Gold cost systems
*
*
* @param Cost Item Id
* @desc When the Item Cost System is enabled, this sets the item required as payment to craft.
* @type item
* @default 0
* @parent Cost Settings
*
*
* @param Format Settings
* @default
*
*
* @param General Formatting
* @desc Formatting for component spell info display
* @type note
* @default "<WordWrap>\n%1\n%2\n%3\n%4\n%5"
* @parent Format Settings
*
*
* @param Font Settings
* @default
*
*
* @param Color Settings
* @default
* @parent Font Settings
*
*
* @param Item Present Color
* @desc Sets the color used when an mateiral item is present in the party inventory (Information Window).
* @type text
* @default FFFFFF
* @parent Color Settings
*
*
* @param Item Not Present Color
* @desc Sets the color used when an mateiral item is not present in the party inventory (Information Window).
* @type text
* @default 983430
* @parent Color Settings
*
*
* @help
* For full help documentation, please see the GitHub page at the link below:
* 
* https://github.com/Geowil/LMPGames_ItemCrafting
*/

var LMPGamesCore = LMPGamesCore || {};
if (Object.keys(LMPGamesCore).length == 0){
	//throw error
	console.log("LMPGames_Core plugin not present OR is not above this plugin.  Plugin will work incorrectly until this issue is resolved!");
}

function Window_ItemCraftPalette() { this.initialize.apply(this, arguments); };
function Window_ItemCraftSelection() { this.initialize.apply(this, arguments); }; //For version 2
function Window_ItemCraftInfo() { this.initialize.apply(this, arguments); };
function Window_ItemCraftCommand() { this.initialize.apply(this, arguments); };
function Scene_ItemCrafting() { this.initialize.apply(this, arguments); };

LMPGamesCore.pluginParams.itemCrafting = PluginManager.parameters('LMPGames_ItemCrafting');
LMPGamesCore.pluginSettings.itemCrafting = {};
LMPGamesCore.pluginData.itemCrafting = {
	itemData: []
};

//Plugin Params
var materialReqMode = parseInt(LMPGamesCore.pluginParams.itemCrafting['Material Requirement Mode']);
var craftingDisplayMode = parseInt(LMPGamesCore.pluginParams.itemCrafting['Display Mode']);
var bEnableNameAliasing = (LMPGamesCore.pluginParams.itemCrafting['Enable Name Aliasing'] === 'true');
var maxObfuscationChars = parseInt(LMPGamesCore.pluginParams.itemCrafting['Max Number of Obfuscation Characters']);
var obfuscationChar = LMPGamesCore.pluginParams.itemCrafting['Obfuscation Character'];
var bEnableCurrencyCostSystem = (LMPGamesCore.pluginParams.itemCrafting['Enable Currency Cost System'] === 'true');
var bEnableItemCostSystem = false; //(LMPGamesCore.pluginParams.itemCrafting['Enable Item Cost System'] === 'true');
//var costItemId = parseInt(LMPGamesCore.pluginParams.itemCrafting['Cost Item Id']);
var genTxFormatting = LMPGamesCore.pluginParams.itemCrafting['General Formatting'];
var itemPresentColor = LMPGamesCore.pluginParams.itemCrafting['Item Present Color'];
var itemNotPresentColor = LMPGamesCore.pluginParams.itemCrafting['Item Not Present Color'];

//Plugin Command Settings
//LMPGamesCore.pluginSettings.itemCrafting['CraftingDifficultyOverride'] = 0.0; -- Version 2


/* Database Manager Functions */
var lmpGamesItemCrafting_DataManager_IsDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function(){
	if (!lmpGamesItemCrafting_DataManager_IsDatabaseLoaded.call(this)) { return false;}
	this.loadItemCraftingNoteTags();
	return true;
};

DataManager.loadItemCraftingNoteTags = function(){
	let itemCraftData = LMPGamesCore.pluginData.itemCrafting;
	itemCraftData.itemData = this.processItemCraftingNoteTags($dataItems, "item");
};

DataManager.processItemCraftingNoteTags = function(dataObj, typ){
	let returnObject = [];
	for(let obj of dataObj){
		if (obj){
			returnObject[obj.id] = {};
			if (obj.note != undefined && obj.note != ""){
				let noteData = obj.note.split(/[\r\n]+/);

				if (noteData){
					let bStartItemCraftingTag = false;
					let bEndItemCraftingTag = false;

					if (typ == "item"){
						returnObject[obj.id]["Id"] = obj.id;
						returnObject[obj.id]["IsCraftingComponent"] = false;
						returnObject[obj.id]["IsCraftable"] = false;
						returnObject[obj.id]["CraftingSystem"] = '';
						returnObject[obj.id]["Cost"] = 0;
						returnObject[obj.id]["RequiredComponents"] = [];
						returnObject[obj.id]["Alias"] = '';
						returnObject[obj.id]["Display"] = (craftingDisplayMode == 1 ? true : false);
					}

					for (let noteLine of noteData){
						switch (noteLine){
							case '<LMP_ItemCrafting>':
								bStartItemCraftingTag = true;
								break;
							case '</LMP_ItemCrafting>':
								bEndItemCraftingTag = true;
								break;
							default:
								if (bStartItemCraftingTag){
									let noteLines = noteLine.split(":");
									if (noteLines[0] == "CraftingComponent") { //Items
										returnObject[obj.id].IsCraftingComponent = true;
										returnObject[obj.id].CraftingSystem = 'item';
									} else if(noteLines[0] == "IsCraftable"){
										returnObject[obj.id].IsCraftable = true;
										returnObject[obj.id].CraftingSystem = 'item';
									} else if (noteLines[0] == "Cost") {
										returnObject[obj.id].Cost = parseInt(noteLines[1]);
								 	} else if (noteLines[0] == 'Alias') {
										returnObject[obj.id].Alias = noteLines[1];
									} else if (noteLines[0] == "Item") {
										let componentData = noteLines[1].split(";");
										for (let i1 = 0; i1 < componentData.length; i1++){
											let component = componentData[i1].split(",");
											if (returnObject[obj.id].RequiredComponents[component[0]] == undefined){
												returnObject[obj.id].RequiredComponents[component[0]] = {
													Id: component[0],
													Amount: 0
												};
											}
											
											returnObject[obj.id].RequiredComponents[component[0]].Amount += parseInt(component[1]);
										}
									}
								}

								break;
						}

						if (bEndItemCraftingTag) {
							break;
						}
					}
				}
			}
		} else {
			returnObject[0] = {};
		}
	}

	return returnObject;
}

/* Game_Interpreter Functions */
var lmpGamesItemCrafting_GameInterpreter_PluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args){
	if (command == "LMPGames.ItemCrafting"){
		let argString = "";

		for (let i1 = 0; i1 < args.length; i1++){
			argString += " " + args[i1];
		}

		command += argString;

		if (command.match(/LMPGames.ItemCrafting[ ]Open/)){
			matches = (/LMPGames.ItemCrafting[ ]Open/.exec(command) || []);

			if (matches.length > 0){
				SceneManager.push(Scene_ItemCrafting);
			}
		} else if (command.match(/LMPGames.ItemCrafting[ ](\d+)[ ]Craftable/)){
			matches = (/LMPGames.ItemCrafting[ ](\d+)[ ]Craftable/.exec(command) || []);

			if (matches.length > 2){
				this.setItemCraftable(matches[1]);
			}
		} else if (command.match(/LMPGames.ItemCrafting[ ](\d+)[ ]Uncraftable/)){
			matches = (/LMPGames.ItemCrafting[ ](\d+)[ ]Uncraftable/.exec(command) || []);

			if (matches.length > 2){
				this.setItemUncraftable(matches[1]);
			}
		} else if (command.match(/LMPGames.ItemCrafting[ ]CraftDiffOverride[ ](\d+)/)){
			matches = (/LMPGames.ItemCrafting[ ]CraftDiffOverride[ ](\d+)/.exec(command) || []);

			if (matches.length > 1){
				this.setItemCraftDiffOverride(parseFloat(matches[1]));
			}
		} else if (command.match(/LMPGames.ItemCrafting[ ]MaterialMode[ ](\d+)/)) {
			matches = (/LMPGames.ItemCrafting[ ]MaterialMode[ ](\d+)/.exec(command) || []);
			if (matches.length > 1) {
				this.setMaterialMode(matches[1]);
			}
		} else if (command.match(/LMPGames.ItemCrafting[ ](\d+)[ ]Display[ ](\d+)/)) {
			matches = (/LMPGames.ItemCrafting[ ](\d+)[ ]Display[ ](\d+)/.exec(command) || []);
			if (matches.length > 2) {
				this.setCraftItemDisplay(matches[1], matches[2]);
			}
		}
	} else {
		lmpGamesItemCrafting_GameInterpreter_PluginCommand.call(this, command, args);
	}
}

Game_Interpreter.prototype.setMaterialMode = function(matMode){
	materialReqMode = matMode;
}

Game_Interpreter.prototype.setCraftItemDisplay = function(itemId, state){
	let itemPluginData = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.Id == itemId);
	if (itemPluginData){
		if (state == 0){
			itemPluginData.Display = false;
		} else {
			itemPluginData.Display = true;
		}
	}
}

Game_Interpreter.prototype.setItemCraftable = function(itemId){
	let itm = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.id == itemId);
	if (item) {
		itm.CanCraft = true;
	}
}

Game_Interpreter.prototype.setItemUncraftable = function(itemId){
	let itm = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.id == itemId);
	if (item) {
		itm.CanCraft = false;
	}
}

Game_Interpreter.prototype.setItemCraftDiffOverride = function(overrideVal){
	LMPGamesCore.pluginSettings.itemCrafting.CraftingDifficultyOverride = overrideVal;
}


/*Scene_ItemCrafting Functions */
Scene_ItemCrafting.prototype = Object.create(Scene_MenuBase.prototype);
Scene_ItemCrafting.prototype.constructor = Scene_ItemCrafting;

Scene_ItemCrafting.prototype.initialize = function(){
	Scene_MenuBase.prototype.initialize.call(this);
	LMPGamesCore.functions.enableWindowScrolling(true);
	LMPGamesCore.functions.enableNameAlias(bEnableNameAliasing);

	//Properties
	this._selectedCraftItemId = 0;
	this._requiredComponents = {};
	this._finalCost = 0;
	this._totalCraftCost = 0;
	this._craftAmount = 0;
	this._itemCost = {};
	this._filteredItems = [];

	//Windows
	this._itmCraftPaletteWnd = undefined;
	this._itmCraftNumberWnd = undefined;
	this._itmCraftInfoWnd = undefined;
	this._itmCraftCmdWnd = undefined;
	this._itmCraftGoldWnd = undefined;
	this._helpWindow = undefined;
}

Scene_ItemCrafting.prototype.create = function(){
	Scene_MenuBase.prototype.create.call(this);
	this.createWindows();

	this._itmCraftPaletteWnd.activate();
	this._itmCraftPaletteWnd.select(0);
	this._itmCraftInfoWnd.show();
}

/*
	TODO:
		Eventually break the palette window down by item type (custom types)
		Support for multiple cost items based on the components used
			This should be an optional sub-feature of Item Cost System
			similar to MC catalysts but w/o the effects; used to properly combined items required by the craft item [explain in-story reasons for this]
		

*/
Scene_ItemCrafting.prototype.createWindows = function(){
	this.createHelpWindow();
	this.createInfoWindow();
	this.createPaletteWindow();
	this.createAmountEntryWindow();
	this.createGoldWindow();
	this.createCommandWindow();
}

Scene_ItemCrafting.prototype.createInfoWindow = function(){
	let x = 310;
	let y = this._helpWindow.height + 10;
	let width = Graphics.boxWidth - x;
	let height = 210;

	this._itmCraftInfoWnd = new Window_ItemCraftInfo(x, y, width, height);
	this._itmCraftInfoWnd.hide();
	this.addWindow(this._itmCraftInfoWnd);
}

Scene_ItemCrafting.prototype.createPaletteWindow = function(){
	let x = 0;
	let y = this._helpWindow.height + 10;
	let width = 300;
	let height = 210;

	this._itmCraftPaletteWnd = new Window_ItemCraftPalette(x, y, width, height, this._helpWindow, this._itmCraftInfoWnd);
	this._itmCraftPaletteWnd.setHandler('ok', this.paletteOkProcessing.bind(this));
	this._itmCraftPaletteWnd.setHandler('cancel', this.paletteCancelProcessing.bind(this));
	this._itmCraftPaletteWnd.show();
	this.addWindow(this._itmCraftPaletteWnd);
}

Scene_ItemCrafting.prototype.paletteOkProcessing = function(){
	this._selectedCraftItemId = this._itmCraftPaletteWnd.getSelectedCraftingItemId();

	this._itmCraftPaletteWnd.deactivate();
	this._itmCraftPaletteWnd.deselect();
	if (bEnableCurrencyCostSystem) {
		this._totalCraftCost = this.getCraftingCost();
		this._itmCraftNumberWnd.setup($dataItems[1], 99, this._totalCraftCost); //Make limit a setting
		this._itmCraftNumberWnd.setCurrencyUnit(TextManager.currencyUnit);
		this._itmCraftNumberWnd.show();
		this._itmCraftNumberWnd.activate();
	}

	if (bEnableCurrencyCostSystem){
		this._itmCraftGoldWnd.show();
	}
}

Scene_ItemCrafting.prototype.getCraftingCost = function(){
	let finalCost = 0;
	this._filteredItems = [];
	getAllCraftingComponents(this._selectedCraftItemId, 1, undefined, this._filteredItems);

	this._filteredItems = this._filteredItems.filter(itm => itm);
	for (let item of this._filteredItems){
		finalCost += item.Amount * item.Cost;
	}

	return finalCost;
}

Scene_ItemCrafting.prototype.paletteCancelProcessing = function(){
	LMPGamesCore.functions.enableWindowScrolling(false);
	LMPGamesCore.functions.enableNameAlias(false);
	SceneManager.pop();
}

Scene_ItemCrafting.prototype.createAmountEntryWindow = function(){
	let x = 0;
	let y = this._itmCraftPaletteWnd.getHeight() + this._helpWindow.height + 20;
	let width = 300;
	let height = 180;

	this._itmCraftNumberWnd =  new Window_ShopNumber(x, y, height,);
	this._itmCraftNumberWnd.setHandler('ok', this.numberWndOkProcessing.bind(this));
	this._itmCraftNumberWnd.setHandler('cancel', this.numberWndCancelProcessing.bind(this));
	this._itmCraftNumberWnd.hide();
	this.addWindow(this._itmCraftNumberWnd);
}

Scene_ItemCrafting.prototype.numberWndOkProcessing = function(){
	this._craftAmount = this._itmCraftNumberWnd.number();

	if (bEnableCurrencyCostSystem) {
		this._finalCost = this._totalCraftCost * this._craftAmount;
	}

	this._itmCraftNumberWnd.deactivate();
	this._itmCraftNumberWnd.deselect();
	this._itmCraftCmdWnd.updateSettings(this._selectedCraftItemId, this._finalCost, this._itemCost, this._filteredItems, this._craftAmount);
	this._itmCraftCmdWnd.show();
	this._itmCraftCmdWnd.activate();
	this._itmCraftCmdWnd.select(0);
}

Scene_ItemCrafting.prototype.numberWndCancelProcessing = function(){
	this._itmCraftNumberWnd.deactivate();
	this._itmCraftNumberWnd.deselect();
	this._itmCraftNumberWnd.hide();

	this._itmCraftPaletteWnd.activate();
	this._itmCraftPaletteWnd.select(0);
}

Scene_ItemCrafting.prototype.createGoldWindow = function(){
	let y = this._itmCraftPaletteWnd.getHeight() + 180 + this._helpWindow.height + 30;
	let x = 0;

	this._itmCraftGoldWnd = new Window_Gold(x, y);
	this._itmCraftGoldWnd.hide();
	this.addWindow(this._itmCraftGoldWnd);
}

Scene_ItemCrafting.prototype.createCommandWindow = function(){
	let x = this._itmCraftPaletteWnd.getWidth() + 10;
	let y = this._helpWindow.height + this._itmCraftInfoWnd.getHeight() + this._itmCraftNumberWnd.height + 30;
	let width = this._itmCraftInfoWnd.getWidth();
	let height = 0;

	this._itmCraftCmdWnd = new Window_ItemCraftCommand(x, y, width, height);
	this._itmCraftCmdWnd.setHandler('ok', this.cmdOkProcessing.bind(this));
	this._itmCraftCmdWnd.setHandler('cancel', this.cmdCancelProcessing.bind(this));
	this._itmCraftCmdWnd.hide();
	this.addWindow(this._itmCraftCmdWnd);
}

Scene_ItemCrafting.prototype.cmdOkProcessing = function(){
	//Remove costs/component items
	let requiredComponents = []; 
	
	if (materialReqMode == 1) {
		requiredComponents = LMPGamesCore.pluginData.itemCrafting.itemData[this._selectedCraftItemId]
		.RequiredComponents.filter(itm => itm);
	} else if (materialReqMode == 2) {
		requiredComponents = this._filteredItems;
	}
	for (let component of requiredComponents) {
		let itemData = $dataItems.find(itm => itm && itm.id == component.Id);
		if (itemData) {
			let amt = component.Amount * this._craftAmount;
			$gameParty.loseItem(itemData, amt, false);
		}
	}

	/*if (bEnableItemCostSystem) {
		for (let key of Object.keys(this._requiredCostItems)) {
			let amt = this._requiredCostItems[key];
			let itemData = $dataItems.find(itm => itm && itm.id == key);
			if (itemData) {
				$gameParty.loseItem(itemData, amt, false);
			}
		}
	}*/

	if (bEnableCurrencyCostSystem) {
		this._finalCost = this._totalCraftCost * this._craftAmount;
		$gameParty.loseGold(this._finalCost);
	}

	//Give crafted item(s)
	let craftItemData = $dataItems.find(itm => itm && itm.id == this._selectedCraftItemId);
	let craftItemPluginData = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.Id == this._selectedCraftItemId);
	if (craftItemData) {
		$gameParty.gainItem(craftItemData, this._craftAmount, false);
		craftItemPluginData.Display = true;
	}

	this.cmdCancelProcessing();
}

Scene_ItemCrafting.prototype.cmdCancelProcessing = function(){
	this.resetProperties();
	this.resetWindows();
	this._itmCraftCmdWnd.deactivate();
	this._itmCraftCmdWnd.deselect();
	this._itmCraftCmdWnd.hide();
	this._itmCraftNumberWnd.hide();
	this._itmCraftNumberWnd.deactivate();
	this._itmCraftPaletteWnd.activate();
	this._itmCraftPaletteWnd.select(0);
}

Scene_ItemCrafting.prototype.resetProperties = function(){
	this._selectedCraftItemId = 0;
	this._requiredComponents = {};
	this._craftAmount = 0;
	
	if (bEnableCurrencyCostSystem) { this._goldCost = 0; }
	if (bEnableItemCostSystem) { this._requiredCostItems = {}; }
}

Scene_ItemCrafting.prototype.resetWindows = function(){
	this._itmCraftInfoWnd.updateSettings(0, this._selectedCraftItemId);
	this._itmCraftCmdWnd.updateSettings(0, this._selectedCraftItemId, 0, 0);
	this._itmCraftPaletteWnd.refresh();
}


/* Window_ItemCraftPalette Functions */
function Window_ItemCraftPalette() { this.initialize.apply(this, arguments); };
Window_ItemCraftPalette.prototype = Object.create(Window_Selectable.prototype);
Window_ItemCraftPalette.prototype.constructor = Window_ItemCraftPalette;

Window_ItemCraftPalette.prototype.initialize = function(x, y, width, height, helpWnd, infoWnd){
	Window_Selectable.prototype.initialize.call(this, x, y, width, height);
	this._width = width;
	this._height = height;
	this._xPos = x;
	this._yPos = y;
	this._helpWindow = helpWnd;

	//Custom Properties
	this._comList = [];
	this._intComList = [];
	this._craftItemIdList = [];
	this._intCraftItemIdList = [];
	this._pageIndex = 0;
	this._totalIndex = 1;
	this._totalItems = 0;
	//this._selectedItemType = 0;
	this._selectedCraftItemId = 0;
	this._infoWindow = infoWnd;
	this._bCanCraft = false;

	this.refresh();
}

//Getters
Window_ItemCraftPalette.prototype.getWidth = function() { return this._width; }
Window_ItemCraftPalette.prototype.getHeight = function() { return this._height; }
Window_ItemCraftPalette.prototype.getX = function() { return this._xPos; }
Window_ItemCraftPalette.prototype.getY = function() { return this._yPos; }
Window_ItemCraftPalette.prototype.getSelectedCraftingItemId = function() { return this._selectedCraftItemId; }
Window_ItemCraftPalette.prototype.maxItems = function() { return (this._comList ? this._comList[this._pageIndex].length : 1); }
Window_ItemCraftPalette.prototype.numVisibleRows = function() { return 4; }
Window_ItemCraftPalette.prototype.itemHeight = function() {
	let clientHeight = this._height - this.padding * 2;
	return Math.floor(clientHeight / this.numVisibleRows());
}

Window_ItemCraftPalette.prototype.itemWidth = function() {
	return Math.floor((this._width - this.padding * 2 +
		this.spacing()) / this.maxCols() - this.spacing());
}

//Doers
Window_ItemCraftPalette.prototype.refresh = function(){
	this.contents.clear();
	this.buildComList();
	this.drawAllItems();
}

Window_ItemCraftPalette.prototype.buildComList = function(){
	this._comList = [];
	this._intComList = [];
	this._totalItems = 0;
	this._craftItemIdList = [];
	this._intCraftItemIdList = [];

	let craftingItems = LMPGamesCore.pluginData.itemCrafting.itemData
		.filter(itm => itm && itm.IsCraftable && itm.CraftingSystem == 'item' &&
			(craftingDisplayMode == 3 && itm.Display ? true : 
				(craftingDisplayMode != 3 ? true : false)));

	let craftingItemIds = [];
	for (let item of craftingItems) {
		craftingItemIds.push(item.Id);
	}

	let craftingItemData = $dataItems.filter(itm => itm && craftingItemIds.contains(itm.id));
	for (let i1 = 0; i1 < craftingItemData.length; i1++) {
		let itmData = craftingItemData[i1];
		let itmName = itmData.name;
		if (this._intComList.length < this.numVisibleRows()) {
			this._intComList.push(itmName);
			this._intCraftItemIdList.push(itmData.id);
			this._totalItems++;
		} else {
			this._comList.push(this._intComList);
			this._craftItemIdList.push(this._intCraftItemIdList);

			this._intComList = [];
			this._intCraftItemIdList = [];

			this._intComList.push(itmName);
			this._intCraftItemIdList.push(itmData.id);
			this._totalItems++;
		}
	}

	for (let i1 = 0; i1 < 1; i1++){
		if (this._intComList.length < this.numVisibleRows()) {
			this._intComList.push("Cancel");
			this._intCraftItemIdList.push(-1);
			this._totalItems++;
		} else {
			this._comList.push(this._intComList);
			this._craftItemIdList.push(this._intCraftItemIdList);

			this._intComList = [];
			this._intCraftItemIdList = [];

			this._intComList.push("Cancel");
			this._intCraftItemIdList.push(-1);
			this._totalItems++;
		}
	}

	if (this._intComList.length > 0){
		this._comList.push(this._intComList);
		this._craftItemIdList.push(this._intCraftItemIdList);
	}
}

Window_ItemCraftPalette.prototype.drawItem = function(index){
	let rect = this.itemRectForText(index);
	let x = rect.width/2;
	let y = rect.y + (rect.height/2) - this.lineHeight() * 0.5;

	let commandName = this._comList[this._pageIndex][index];
	let bCanCraft = (index > -1 && commandName != "Cancel" ? false : true);
	let requiredComponentIds = [];

	if (index > -1 && commandName != "Cancel") {
		let currentCraftItemId = this._craftItemIdList[this._pageIndex][index];
		let requiredComponents = [];
		
		if (materialReqMode == 1) {
			requiredComponents = LMPGamesCore.pluginData.itemCrafting.itemData[currentCraftItemId].RequiredComponents;
		} else if (materialReqMode == 2){
			let filteredItems = [];
			getAllCraftingComponents(currentCraftItemId, 1, undefined, filteredItems);
			requiredComponents = filteredItems;
		}

		requiredComponents =  requiredComponents.filter(itm => itm);
		for (let item of requiredComponents) {
			requiredComponentIds.push(item.Id);
		}

		if (requiredComponentIds.length > 0) {
			for (let itemId of requiredComponentIds) {
				if (this.bPartyHasComponentItems(itemId)){
					bCanCraft = (!bCanCraft ? true : bCanCraft);
				} else {
					bCanCraft = (bCanCraft ? false : bCanCraft);
					break;
				}
			}
		}

		let itemData = $dataItems.find(itm => itm && itm.id == currentCraftItemId);
		let itemPluginData = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.Id == currentCraftItemId);
		if (itemData && itemPluginData) {
			if (craftingDisplayMode == 2){
				if (!itemPluginData.Display){
					LMPGamesCore.functions.setObfuscationSettings(obfuscationChar, maxObfuscationChars, true);
				} else {
					LMPGamesCore.functions.resetObfuscationSettings();
				}
			}

			commandName = LMPGamesCore.functions.itemNameBuilder(itemData, itemPluginData.Alias, this._width, this.contents);
		}
	}
	
	this.changePaintOpacity(bCanCraft);
	this.drawTextEx(commandName, rect.x, rect.y);
}

Window_ItemCraftPalette.prototype.bPartyHasComponentItems = function(itemId){
	let itemData = $dataItems.find(itm => itm && itm.id == itemId);
	if (itemData) {
		if ($gameParty.numItems(itemData) == 0) {
			return false;
		} else {
			return true;
		}
	}

	return false;
}

Window_ItemCraftPalette.prototype.processCursorMove = function(){
	if (this.isCursorMovable()) {
		LMPGamesCore.functions.processCursorMove(this);
	}
};

Window_ItemCraftPalette.prototype.select = function(index){
	this._index = index;
	if (index > -1) {
		if (this._comList[this._pageIndex][this._index] != "Cancel"){
			let requiredComponentIds = [];
			let requiredComponents = [];
			this._selectedCraftItemId = this._craftItemIdList[this._pageIndex][this._index];
			this._infoWindow.updateSettings(1, this._selectedCraftItemId);

			if (materialReqMode == 1) {
				requiredComponents = LMPGamesCore.pluginData.itemCrafting.itemData[this._selectedCraftItemId].RequiredComponents;
			} else if (materialReqMode == 2){
				let filteredItems = [];
				getAllCraftingComponents(this._selectedCraftItemId, 1, undefined, filteredItems);
				requiredComponents = filteredItems;
			}
	
			requiredComponents =  requiredComponents.filter(itm => itm);
			for (let item of requiredComponents) {
				requiredComponentIds.push(item.Id);
			}

			if (requiredComponentIds.length > 0) {
				for (let itemId of requiredComponentIds) {
					if (this.bPartyHasComponentItems(itemId)){
						if (!this._bCanCraft){
							this._bCanCraft = true;
						}
					} else {
						if (this._bCanCraft){
							this._bCanCraft = false;
							break;
						}
					}
				}
			}
		} else {
			this._infoWindow.updateSettings(1, -1);
		}
	}

	this._stayCount = 0;
	this.ensureCursorVisible();
	this.updateCursor();
	//this.callUpdateHelp();
}

Window_ItemCraftPalette.prototype.processOk = function(){
	if (this._index > -1){
		if (this._comList[this._pageIndex][this._index] != "Cancel"){
			this._selectedCraftItemId = this._craftItemIdList[this._pageIndex][this._index];
			if (this._bCanCraft){
				Window_Selectable.prototype.processOk.apply(this);
			} else {
				SoundManager.playCancel();
			}
		} else {
			Window_Selectable.prototype.processCancel.apply(this);
		}
	} else {
		Window_Selectable.prototype.processCancel.apply(this);
	}
}

function Window_ItemCraftSelection() { this.initialize.apply(this, arguments); };

/* Window_ItemCraftInfo Functions */
Window_ItemCraftInfo.prototype = Object.create(Window_Selectable.prototype);
Window_ItemCraftInfo.prototype.constructor = Window_ItemCraftInfo;
Window_ItemCraftInfo.prototype.initialize = function(x, y, width, height){
	Window_Selectable.prototype.initialize.call(this, x, y, width, height);
	this._width = width;
	this._height = height;
	this._xPos = x;
	this._yPos = y;

	//Custom Properties
	this._selectedCraftItemId = 0;
	this._mode = 0;
	this._countdown = 0;
	this._arrowBlinkTimer = 0;
	this._lastOriginY = 0;
	this._allTextHeight = 0;
	this._lineHeight = this.lineHeight();

	this.refresh();
}

//Getters
Window_ItemCraftInfo.prototype.getWidth = function() { return this._width; }
Window_ItemCraftInfo.prototype.getHeight = function() { return this._height; }
Window_ItemCraftInfo.prototype.getX = function() { return this._xPos; }
Window_ItemCraftInfo.prototype.getY = function() { return this._yPos; }


//Setters
Window_ItemCraftInfo.prototype.updateSettings = function(mode, selectedItemId){
	this._selectedCraftItemId = selectedItemId;
	this._mode = mode;

	this.refresh();
}


//Doers
Window_ItemCraftInfo.prototype.refresh = function(){
	if (this._countdown > 0) { return; }
	this.contents.clear();
	this._lastOriginY = -200;
	this.origin.y = 0;
	this._allTextHeight = 0;

	if (this._selectedCraftItemId > -1){
		if (this._mode == 1){
			this.drawPaletteInfo();
		} else if (this._mode == 2){
			//ShopNumber - Version 2
		}
	}
}

Window_ItemCraftInfo.prototype.drawPaletteInfo = function(){
	let totalText = "";
	let text = "";
	let textState = {};
	if (this._selectedCraftItemId > 0) {
		let title = "Crafting Materials Required";
		let materialList = "";
		let requiredComponents = [];
		let infoFormat = JSON.parse(genTxFormatting);
		if (infoFormat) {
			let halfWndW = this._width / 2;
			this.contents.fontSize = 26;
			let titleLen = this.contents.measureTextWidth(title);
			let titlePos = Math.floor(halfWndW - (titleLen/1.5));

			titlePos = Math.floor((titlePos < 0 ? (titlePos) * -1 : titlePos));
			title = LMPGamesCore.functions.addXShift(title, titlePos);
			title = LMPGamesCore.functions.changeFontSize(title, 26);
			title = LMPGamesCore.functions.addBreak(title, 'end');

			if (materialReqMode == 1) {
				requiredComponents = LMPGamesCore.pluginData.itemCrafting.itemData[this._selectedCraftItemId].RequiredComponents;
			} else if (materialReqMode == 2) {
				let filteredItems = [];
				getAllCraftingComponents(this._selectedCraftItemId, 1, undefined, filteredItems);
				requiredComponents = filteredItems;
			}

			requiredComponents = requiredComponents.filter(itm => itm);
			let numOfUnknowns = 0;
			for (let component of requiredComponents) {
				let itemData = $dataItems.find(itm => itm && itm.id == component.Id);
				let itemPluginData = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.Id == component.Id);
				let alias = (itemPluginData ? itemPluginData.Alias : '');
				if (itemData){
					let itemName = "";
					if (craftingDisplayMode == 1) {
						itemName = LMPGamesCore.functions.itemNameBuilder(itemData, alias, this._width, this.contents);
						itemName = LMPGamesCore.functions.addXShift(itemName, 5);
						itemName = LMPGamesCore.functions.addBreak(itemName, 'end');
					} else if (craftingDisplayMode == 2) {
						if (!itemPluginData.Display) {
							LMPGamesCore.functions.setObfuscationSettings(obfuscationChar, maxObfuscationChars, true);
						} else {
							LMPGamesCore.functions.resetObfuscationSettings();
						}

						itemName = LMPGamesCore.functions.itemNameBuilder(itemData, alias, this._width, this.contents);
						itemName = LMPGamesCore.functions.addXShift(itemName, 5);
						itemName = LMPGamesCore.functions.addBreak(itemName, 'end');
					} else if (craftingDisplayMode == 3) {
						if (!itemPluginData.Display) {
							numOfUnknowns++;
						} else {
							itemName = LMPGamesCore.functions.itemNameBuilder(itemData, alias, this._width, this.contents);
							itemName = LMPGamesCore.functions.addXShift(itemName, 5);
							itemName = LMPGamesCore.functions.addBreak(itemName, 'end');
						}
					}
					
					nameTextColor = ($gameParty.numItems(itemData) > 0 ? itemPresentColor : itemNotPresentColor);
					itemName = LMPGamesCore.functions.changeTextColor(itemName,'both', nameTextColor, 'FFFFFF');
					materialList += itemName;
				}
			}

			if (craftingDisplayMode == 3 && numOfUnknowns > 0) {
				let unknownString = String(numOfUnknowns) + " Unknown " + (numOfUnknowns > 1 ? "Materials" : "Material") + " Required";
				unknownString = LMPGamesCore.functions.addXShift(unknownString, 5);
				unknownString = LMPGamesCore.functions.addBreak(unknownString, 'end');

				materialList += unknownString;
			}

			materialList = LMPGamesCore.functions.addBreak(materialList, 'end');
		}

		totalText = totalText.concat(title, materialList, "", "", "", "");
		text = infoFormat.format(title, materialList, "", "", "", "");

		textState = { index: 0 };
		textState.originalText = text;
		textState.text = this.convertEscapeCharacters(text);
		let convertedTextHeight = this.calcTextHeight(textState, true);
		this._allTextHeight = (convertedTextHeight > 600 ? convertedTextHeight / 2 : convertedTextHeight);
		this._allTextHeight = LMPGamesCore.functions.getCalculatedTextHeight(true, this._allTextHeight, this._width, text, false);
		this.createContents();
		this.drawTextEx(text, 0, 0);
	}
}


//For Window Scrolling
Window_ItemCraftInfo.prototype.scrollSpeed = function() {
	if (this._scrollSpeed === undefined) {
	  this._scrollSpeed = 5;
	}
	return this._scrollSpeed;
  };
  
  Window_ItemCraftInfo.prototype.scrollOriginDown = function(speed) {
	var value = this.contentsHeight() - this.height +
	  this.standardPadding() * 2;
	this.origin.y = Math.min(value, this.origin.y + speed);
  };
  
  Window_ItemCraftInfo.prototype.scrollOriginUp = function(speed) {
	this.origin.y = Math.max(0, this.origin.y - speed);
  };
  
  Window_ItemCraftInfo.prototype.updateKeyScrolling = function() {
	if (Input.isPressed('up')) {
	  this.scrollOriginUp(this.scrollSpeed());
	} else if (Input.isPressed('down')) {
	  this.scrollOriginDown(this.scrollSpeed());
	} else if (Input.isPressed('pageup')) {
	  this.scrollOriginUp(this.scrollSpeed() * 4);
	} else if (Input.isPressed('pagedown')) {
	  this.scrollOriginDown(this.scrollSpeed() * 4);
	}
  };
  
  Window_ItemCraftInfo.prototype.updateArrows = function() {
	if (this._lastOriginY === this.origin.y) return;
	this.showArrows();
  };
  
  Window_ItemCraftInfo.prototype.showArrows = function() {
	this._lastOriginY = this.origin.y;
	this.upArrowVisible = this.origin.y !== 0;
	this.downArrowVisible = this.origin.y !== this.contentsHeight() -
	  this.height + this.standardPadding() * 2;
  };
  
  Window_ItemCraftInfo.prototype.hideArrows = function() {
	this.upArrowVisible = false;
	this.downArrowVisible = false;
  };
  
  Window_ItemCraftInfo.prototype.isInsideFrame = function() {
	var x = this.canvasToLocalX(TouchInput._mouseOverX);
	var y = this.canvasToLocalY(TouchInput._mouseOverY);
	return x >= 0 && y >= 0 && x < this.width && y < this.height;
  };
  
  Window_ItemCraftInfo.prototype.processWheel = function() {
	if (!this.isInsideFrame()) return;
	var threshold = 20;
	if (TouchInput.wheelY >= threshold) {
	  this.scrollOriginDown(this.scrollSpeed() * 4);
	}
	if (TouchInput.wheelY <= -threshold) {
	  this.scrollOriginUp(this.scrollSpeed() * 4);
	}
  };


/* Window_ItemCraftCommand Functions */
Window_ItemCraftCommand.prototype = Object.create(Window_HorzCommand.prototype);
Window_ItemCraftCommand.prototype.constructor = Window_ItemCraftCommand;
Window_ItemCraftCommand.prototype.initialize = function(x, y , width, height){
	this._width = width;	
	this._height = height;
	this._xPos = x;
	this._yPos = y;

	//Custom Properties
	this._list = [];
	this._selectedCraftItemId = 0;
	this._goldCost = 0;
	this._itemCost = {};
	this._requiredMaterials = [];
	this._craftAmount = 0;

	Window_HorzCommand.prototype.initialize.call(this, x, y);
	this.refresh();
}

//Getters
Window_ItemCraftCommand.prototype.findIdxSymbol = function(idx){
	return (idx !== -1  && idx < this._list.length ? this._list[idx].symbol : 'cancel');
}

//Setters
Window_ItemCraftCommand.prototype.updateSettings = function(selectedItemId, goldCost, itemCost, requiredMaterials, craftAmount){
	this._selectedCraftItemId = selectedItemId;
	this._goldCost = goldCost;
	this._itemCost = itemCost;
	this._requiredMaterials = requiredMaterials;
	this._craftAmount = craftAmount;

	this.refresh();
}

Window_ItemCraftCommand.prototype.windowWidth = function() { return this._width; };
Window_ItemCraftCommand.prototype.standardFontSize = function() { return 28; };
Window_ItemCraftCommand.prototype.maxCols = function() { return 2; };

//Doers
Window_ItemCraftCommand.prototype.refresh = function(){
	this.clearCommandList();
	this.makeCommandList();
	Window_HorzCommand.prototype.refresh.call(this);
}

Window_ItemCraftCommand.prototype.select = function(index){
	this._index = index;
    this._stayCount = 0;
    this.ensureCursorVisible();
    this.updateCursor();
    this.callUpdateHelp();
}

Window_ItemCraftCommand.prototype.makeCommandList = function(){
	let requiredComponents = [];
	let currentPartyGold = $gameParty.gold();
	let bCanCraft = false;

	if (this._selectedCraftItemId > 0){
		if (materialReqMode == 1) {
			requiredComponents = LMPGamesCore.pluginData.itemCrafting.itemData[this._selectedCraftItemId].RequiredComponents;
		} else if (materialReqMode == 2){
			let filteredItems = [];
			getAllCraftingComponents(this._selectedCraftItemId, this._craftAmount, undefined, filteredItems);
			requiredComponents = filteredItems;
		}

		requiredComponents = requiredComponents.filter(itm => itm);
		for (let component of requiredComponents) {
			let itemData = $dataItems.find(itm => itm && itm.id == component.Id);
			if (itemData) {
				let currentPartyItems = $gameParty.numItems(itemData);
				if (currentPartyItems != 0 && (component.Amount * this._craftAmount) <= currentPartyItems) {
					bCanCraft = (!bCanCraft ? true : bCanCraft);
				} else {
					bCanCraft = (bCanCraft ? false : bCanCraft);
					break;
				}
			}
		}

		if (bCanCraft) {
			if (this._goldCost > currentPartyGold) {
				bCanCraft = (bCanCraft ? false : bCanCraft);
			}
		}
	}

	this.addCommand('Craft Item', 'ok', bCanCraft);
	this.addCommand('Cancel', 'cancel');
}

Window_ItemCraftCommand.prototype.processOk = function(){
	if (this._index > -1){
		let selSym = this.findIdxSymbol(this._index);

		if (selSym && selSym != 'cancel') {
			if (selSym == 'ok') { Window_Selectable.prototype.processOk.apply(this); }
			else { Window_Selectable.prototype.processCancel.apply(this); }
		} else {
			Window_Selectable.prototype.processCancel.apply(this);
		}
	}
}

function getAllCraftingComponents(currentCraftItem, numOfCraftItems, previousMaterial, filteredItems){
	if (LMPGamesCore.pluginData.itemCrafting.itemData[currentCraftItem].IsCraftable) {
		let materialItems = LMPGamesCore.pluginData.itemCrafting.itemData[currentCraftItem]
			.RequiredComponents.filter(itm => itm);

		for (let material of materialItems) {
			let materialPluginData = LMPGamesCore.pluginData.itemCrafting.itemData.find(itm => itm && itm.Id == material.Id);
			if (materialPluginData) {
				getAllCraftingComponents(material.Id, (material.Amount * numOfCraftItems), materialPluginData, filteredItems);
			}
		}
	} else {
		if (filteredItems[currentCraftItem] == undefined) {
			filteredItems[currentCraftItem] = {
				Id: currentCraftItem,
				Cost: previousMaterial.Cost,
				Amount: 0
			};
		}

		filteredItems[currentCraftItem].Amount += numOfCraftItems;
	}
}
