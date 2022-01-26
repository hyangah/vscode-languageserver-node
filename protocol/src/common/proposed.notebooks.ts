/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI, integer, DocumentUri, uinteger, LSPAny, LSPObject, TextDocumentItem, TextDocumentIdentifier, VersionedTextDocumentIdentifier } from 'vscode-languageserver-types';

import * as Is from './utils/is';
import { ProtocolNotificationType, RegistrationType } from './messages';
import { StaticRegistrationOptions, NotebookDocumentFilter, TextDocumentContentChangeEvent } from './protocol';

/**
 * Notebook specific client capabilities.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentSyncClientCapabilities {

	/**
	 * Whether implementation supports dynamic registration. If this is
	 * set to `true` the client supports the new
	 * `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $NotebookDocumentClientCapabilities {
	notebookDocument?: {
		synchronization: NotebookDocumentSyncClientCapabilities;
	};
}

/**
 * A notebook cell kind.
 *
 * @since 3.17.0 - proposed state
 */
export namespace NotebookCellKind {

	/**
     * A markup-cell is formatted source that is used for display.
     */
	export const Markup: 1 = 1;

	/**
     * A code-cell is source code.
     */
	export const Code: 2 = 2;

	export function is(value: any): value is NotebookCellKind {
		return value === 1 || value === 2;
	}
}
export type NotebookCellKind = 1 | 2;

/**
 * A notebook cell.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookCell {

	/**
	 * The cell's kind
	 */
	kind: NotebookCellKind;

	/**
	 * The cell's text represented as a text document.
	 * The document's content is synced using the
	 * existing text document sync notifications.
	 */
	document: DocumentUri;

	/**
	 * Additional metadata stored with the cell.
	 */
	metadata?: LSPObject;
}

export namespace NotebookCell {
	export function create(kind: NotebookCellKind, document: DocumentUri): NotebookCell {
		return { kind, document };
	}

	export function is(value: any): value is NotebookCell {
		const candidate: NotebookCell = value;
		return Is.objectLiteral(candidate) && NotebookCellKind.is(candidate.kind) && DocumentUri.is(candidate.document) &&
			(candidate.metadata === undefined || Is.objectLiteral(candidate.metadata));
	}

	export function equals(one: NotebookCell, other: NotebookCell, compareMetaData: boolean = false): boolean {
		if (one.kind !== other.kind || one.document !== other.document) {
			return false;
		}
		return !compareMetaData || (compareMetaData && equalsMetadata(one.metadata, other.metadata));
	}

	function equalsMetadata(one: LSPAny | undefined, other: LSPAny | undefined): boolean {
		if (one === other) {
			return true;
		}
		if (one === null || one === undefined || other === null || other === undefined) {
			return false;
		}
		if (typeof one !== typeof other) {
			return false;
		}
		if (typeof one !== 'object') {
			return false;
		}
		const oneArray = Array.isArray(one);
		const otherArray = Array.isArray(other);
		if (oneArray !== otherArray) {
			return false;
		}

		if (oneArray && otherArray) {
			if (one.length !== other.length) {
				return false;
			}
			for (let i = 0; i < one.length; i++) {
				if (!equalsMetadata(one[i], other[i])) {
					return false;
				}
			}
		}
		if (Is.objectLiteral(one) && Is.objectLiteral(other)) {
			const oneKeys = Object.keys(one);
			const otherKeys = Object.keys(other);

			if (oneKeys.length !== otherKeys.length) {
				return false;
			}

			oneKeys.sort();
			otherKeys.sort();
			if (!equalsMetadata(oneKeys, otherKeys)) {
				return false;
			}
			for (let i = 0; i < oneKeys.length; i++) {
				const prop = oneKeys[i];
				if (!equalsMetadata((one as LSPObject)[prop], (other as LSPObject)[prop])) {
					return false;
				}
			}
		}
		return true;
	}
}

/**
 * A notebook document.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocument {

	/**
	 * The notebook document's uri.
	 */
	uri: URI;

	/**
	 * The type of the notebook.
	 */
	notebookType: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
	version: integer;

	/**
	 * The cells of a notebook.
	 */
	cells: NotebookCell[];

	/**
	 * Additional metadata stored with the notebook
	 * document.
	 */
	metadata?: LSPObject;
}

export namespace NotebookDocument {
	export function create(uri: URI, notebookType: string, version: integer, cells: NotebookCell[]): NotebookDocument {
		return { uri, notebookType, version, cells };
	}
	export function is(value: any): value is NotebookDocument {
		const candidate: NotebookDocument = value;
		return Is.objectLiteral(candidate) && Is.string(candidate.uri) && integer.is(candidate.version) && Is.typedArray(candidate.cells, NotebookCell.is);
	}
}

/**
 * A literal to identify a notebook document in the client.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentIdentifier {
	/**
	 * The notebook document's uri.
	 */
	uri: URI;
}

/**
 * A versioned notebook document identifier.
 *
 * @since 3.17.0 - proposed state
 */
export interface VersionedNotebookDocumentIdentifier {

	/**
	 * The version number of this notebook document.
	 */
	version: integer;

	/**
	 * The notebook document's uri.
	 */
	uri: URI;
}

/**
 * Options specific to a notebook plus its cells
 * to be synced to the server.
 *
 * If a selector provide a notebook document
 * filter but no cell selector all cells of a
 * matching notebook document will be synced.
 *
 * If a selector provides no notebook document
 * filter but only a cell selector all notebook
 * document that contain at least one matching
 * cell will be synced.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentSyncOptions = {
	/**
	 * The notebook document to be synced
	 */
	notebookDocumentSelector: ({
		/** The notebook documents to be synced */
		notebookDocumentFilter: NotebookDocumentFilter;
		/** The cells of the matching notebook to be synced */
		cellSelector?: { language: string }[];
	} | {
		/** The notebook documents to be synced */
		notebookDocumentFilter?: NotebookDocumentFilter;
		/** The cells of the matching notebook to be synced */
		cellSelector: { language: string }[];
	})[];

	/**
	 * Determines how the notebook is synchronized.
	 *
	 * If set to 'notebook' the notebook document,
	 * its meta data, cell structure and the cell's
	 * text documents are synchronized.
	 *
	 * If set to 'cellContent' only the cell content
	 * is synchronized using the available
	 * `textDocument/did*` notifications.
	 */
	mode: 'notebook' | 'cellContent';

	/**
	 * Whether save notification should be forwarded to
	 * the server. Will only be honored if mode === `notebook`.
	 */
	save?: boolean;
};

/**
 * Registration options specific to a notebook.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentSyncRegistrationOptions = NotebookDocumentSyncOptions & StaticRegistrationOptions;

export interface $NotebookDocumentSyncServerCapabilities {
	notebookDocumentSync?: NotebookDocumentSyncOptions | NotebookDocumentSyncRegistrationOptions;
}


export namespace NotebookDocumentSyncRegistrationType {
	export const method: 'notebookDocument/sync' = 'notebookDocument/sync';
	export const type = new RegistrationType<NotebookDocumentSyncRegistrationOptions>(method);
}

/**
 * The params sent in a open notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidOpenNotebookDocumentParams {

	/**
	 * The notebook document that got opened.
	 */
	notebookDocument: NotebookDocument;

	/**
	 * The text documents that represent the content
	 * of a notebook cell.
	 */
	cellTextDocuments: TextDocumentItem[];
}

/**
 * A notification sent when a notebook opens.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidOpenNotebookDocumentNotification {
	export const method: 'notebookDocument/didOpen' = 'notebookDocument/didOpen';
	export const type = new ProtocolNotificationType<DidOpenNotebookDocumentParams, void>(method);
}

/**
 * A change describing how to move a `NotebookCell`
 * array from state S' to S''.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookCellArrayChange {
	/**
	 * The start oftest of the cell that changed.
	 */
	start: uinteger;

	/**
	 * The deleted cells
	 */
	deleteCount: uinteger;

	/**
	 * The new cells, if any
	 */
	cells?: NotebookCell[];
}

export namespace NotebookCellArrayChange {
	export function is(value: any): value is NotebookCellArrayChange {
		const candidate: NotebookCellArrayChange = value;
		return Is.objectLiteral(candidate) && uinteger.is(candidate.start) && uinteger.is(candidate.deleteCount) && (candidate.cells === undefined || Is.typedArray(candidate.cells, NotebookCell.is));
	}

	export function create(start: uinteger, deleteCount: uinteger, cells?: NotebookCell[]): NotebookCellArrayChange {
		const result: NotebookCellArrayChange = { start, deleteCount };
		if (cells !== undefined) {
			result.cells = cells;
		}
		return result;
	}
}

/**
 * A change event for a notebook document.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentChangeEvent {
	/**
	 * The changed meta data if any.
	 */
	metadata?: LSPObject;

	/**
	 * Cells got added, remove or reordered.
	 */
	cellStructure?: {
		/**
		 * The change to the cell array.
		 */
		array: NotebookCellArrayChange;
		/**
		 * Additional opened cell text documents.
		 */
		didOpen?: TextDocumentItem[];
		/**
		 * Additional closed cell text documents.
		 */
		didClose?: TextDocumentIdentifier[];
	};

	/**
	 * Cell properties like meta data
	 * or kind.
	 */
	cellData?: NotebookCell[];

	/**
     * The changed cell text documents
     * if any.
     */
	cellTextDocuments?: {
		textDocument: VersionedTextDocumentIdentifier;
		contentChanges: TextDocumentContentChangeEvent[];
	}[];
}

/**
 * The params sent in a change notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidChangeNotebookDocumentParams {

	/**
	 * The notebook document that did change. The version number points
	 * to the version after all provided changes have been applied. If
	 * only the text document content of a cell changes the notebook version
	 * doesn't necessarily have to change.
	 */
	notebookDocument: VersionedNotebookDocumentIdentifier;

	/**
	 * The actual changes to the notebook document.
	 *
	 * The changes describe single state changes to the notebook document.
	 * So if there are two changes c1 (at array index 0) and c2 (at array
	 * index 1) for a notebook in state S then c1 moves the notebook from
	 * S to S' and c2 from S' to S''. So c1 is computed on the state S and
	 * c2 is computed on the state S'.
	 *
	 * To mirror the content of a notebook using change events use the following approach:
	 * - start with the same initial content
	 * - apply the 'notebookDocument/didChange' notifications in the order you receive them.
	 * - apply the `NotebookChangeEvent`s in a single notification in the order
	 *   you receive them.
	 */
	change: NotebookDocumentChangeEvent;
}

export namespace DidChangeNotebookDocumentNotification {
	export const method: 'notebookDocument/didChange' = 'notebookDocument/didChange';
	export const type = new ProtocolNotificationType<DidChangeNotebookDocumentParams, void>(method);
}

/**
 * The params sent in a save notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidSaveNotebookDocumentParams {
	/**
	 * The notebook document that got saved.
	 */
	notebookDocument: NotebookDocumentIdentifier;
}

/**
 * A notification sent when a notebook document is saved.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidSaveNotebookDocumentNotification {
	export const method: 'notebookDocument/didSave' = 'notebookDocument/didSave';
	export const type = new ProtocolNotificationType<DidSaveNotebookDocumentParams, void>(method);
}

/**
 * The params sent in a close notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidCloseNotebookDocumentParams {

	/**
	 * The notebook document that got closed.
	 */
	notebookDocument: NotebookDocumentIdentifier;

	/**
	 * The text documents that represent the content
	 * of a notebook cell that got closed.
	 */
	cellTextDocuments: TextDocumentIdentifier[];
}

/**
 * A notification sent when a notebook closes.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidCloseNotebookDocumentNotification {
	export const method: 'notebookDocument/didClose' = 'notebookDocument/didClose';
	export const type = new ProtocolNotificationType<DidCloseNotebookDocumentParams, void>(method);
}