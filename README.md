# MetadataHarmonizer

MetadataHarmonizer is a schema-driven browser-based spreadsheet editor and validator for structured metadata. It can run locally or offline and builds its templates from [LinkML](https://linkml.io/) specifications.

This project is inspired by and adapted from the original DataHarmonizer work, while expanding the scope beyond the original pathogen-genomics-centered use case into a more general metadata harmonization workflow.

Inspired by:

**The DataHarmonizer: a tool for faster data harmonization, validation, aggregation and analysis of pathogen genomics contextual information**

Microbial Genomics (9:1) 2023

DOI: https://doi.org/10.1099/mgen.0.000908

_Ivan S. Gill, Emma J. Griffiths​, Damion Dooley​, Rhiannon Cameron​, Sarah Savić Kallesøe​, Nithu Sara John​, Anoosha Sehar​, Gurinder Gosal​, David Alexander​, Madison Chapel​, Matthew A. Croxen​​, Benjamin Delisle​, Rachelle Di Tullio​, Daniel Gaston​, Ana Duggan​, Jennifer L. Guthrie​, Mark Horsman4​, Esha Joshi​, Levon Kearny​, Natalie Knox​, Lynette Lau​, Jason J. LeBlanc9, Vincent Li​, Pierre Lyons​, Keith MacKenzie1, Andrew G. McArthur​, Emily M. Panousis​, John Palmer​, Natalie Prystajecky​, Kerri N. Smith​, Jennifer Tanner​, Christopher Townend​, Andrea Tyler, Gary Van Domselaar​, William W. L. Hsiao_

## Installation

This repository contains the full MetadataHarmonizer development environment, including the scripts needed to generate both a code library for **API** use and a stand-alone browser application. Instructions for setting this up are in the **Development** section below.

Using the API allows MetadataHarmonizer to be embedded in a custom interface, for example with a specific template preloaded and custom controls or workflow steps around it.

# Stand-Alone MetadataHarmonizer Functionality

In addition to API use, the development environment can generate a stand-alone browser-based version of MetadataHarmonizer with bundled templates and example inputs. Some bundled templates in this repository still reflect the public-health and pathogen-metadata heritage inherited from DataHarmonizer, but the application itself is intended as a more general metadata harmonization and validation tool.

## Technical Divergence from DataHarmonizer

MetadataHarmonizer still inherits much of the original DataHarmonizer architecture, especially the LinkML-driven template model and the Handsontable-based runtime. This fork currently diverges in a few concrete ways:

- Broader metadata scope: the repository is positioned as a general metadata harmonization and validation tool rather than being centered on the original pathogen-genomics framing.
- Local experiment bootstrapping: the app now supports focused experiment launchers such as `yarn experiment:tabular`, `yarn experiment:validation`, `yarn experiment:tabulator`, and `yarn experiment:revogrid`, along with URL-driven loading of bundled `exampleInput` files and optional automatic validation.
- Grid-engine migration work: this repository includes explicit engine-selection plumbing, audit artifacts, and isolated spike harnesses for Tabulator and RevoGrid under `docs/grid-engine/` and `web/spikes/grid-engine/`.
- Runtime state exposure for experiments: the app records requested versus active grid engine state on the root HTML element, which makes fallback behavior and spike mode visible to tests and manual inspection.
- Expanded end-to-end coverage for experimentation: the repository includes focused Playwright coverage for example-input bootstrapping and the grid-engine smoke and spike paths.

At the same time, this is not yet a fully engine-agnostic rewrite. The shipped runtime still defaults to Handsontable, and the candidate grid engines remain in spike or evaluation mode rather than production adapter mode.

### Current Migration Status

- Handsontable has not been removed from the repository.
- Handsontable is still the active shipped runtime and the only implemented grid engine today.
- RevoGrid is the current preferred migration target based on the spike findings, but that migration has not yet been completed.
- The intent is to keep adapting the codebase toward a narrower engine boundary and remove the Handsontable dependency fully in a later phase, once the replacement path is production-ready.

## Select Template

The currently bundled default template is "CanCOGeN Covid-19". To change the spreadsheet template, select the white text box to the right of **Template**, which always contains the name of the active template, or navigate to **File** followed by **Change Template**. An in-app window will appear that allows you to select from the available templates in the drop-down menu. After selecting the desired template, click **Open** to activate it.

![change template](./images/changeTemplate.gif)

A second way to access templates directly, rather than by the hard-coded menu system, is to specify the MetadataHarmonizer template subfolder via a `template` URL parameter. This enables development and use of customized templates, or new ones, that are not yet exposed in the menu.

For example, when running locally,
`http://localhost:8080/?template=gisaid/GISAID`
accesses the `/templates/gisaid/` template directly.

For historical background on template structure, see the upstream [DataHarmonizer templates](https://github.com/cidgoh/DataHarmonizer/wiki/DataHarmonizer-Templates) documentation.

## Usage

You can edit the cells manually, or upload `xlsx`, `xls`, `tsv`, `csv` and `json` files via **File** > **Open**. You can also save the spreadsheet's contents to your local drive in the same formats, or use **File** > **Export** to format data for a specific portal, repository, or downstream workflow when a template provides export targets.

![saving and exporting files](./images/exportingFiles.gif)

Click the **Validate** button to validate your spreadsheet's values against a
standardized vocabulary. You can then browse through the errors using the **Next Error** button. Missing value are indicated in _dark red_, while incorrect values are _light red_. After resolving these errors, revalidate to see if any remain. If there are no more errors the “Next Error” button will change to “No Errors” and then dissapear.

![validating cells and checking next error](./images/validatingCells.gif)

Double click any column headers for information on the template's vocabulary. This usually includes the definition of the field, guidance on filling in the field, and examples of how data might look structured according to the constraints of the validator.

![double click headers for more info](./images/doubleClickHeaders.gif)

You can quickly navigate to a column by selecting **Settings** > **Jump to...**. An in-app window will appear, select the desired column header from the drop-down list or begin typing its name to narrow down the list options. Selecting the column header from the drop down list will immediately relocate you to that column on the spreadsheet.

![jump to column](./images/jumpToColumn.gif)

You can also automatically fill a column with a specified value, but only in rows with corresponding values in the first `sample ID` column. To use this feature select **Settings** > **Fill column...**. Select the desired column header from the drop-down list or begin typing its name to narrow down the list options, then specify the value to fill with and click **Ok** to apply.

![fill column, in rows with corresponding sample IDs, with specified value](./images/fillColumn.gif)

For more information on available application features, select the **Help** button followed by **Getting Started** from within the MetadataHarmonizer application. Historical UI walkthrough material is also available in the upstream [**Getting Started**](https://github.com/cidgoh/DataHarmonizer/wiki/DataHarmonizer---Getting-Started) guide.

## Example Data

The stand-alone version of MetadataHarmonizer, when built, is placed in the `/web/dist/` folder. Templates with bundled example data expose it under an `exampleInput/` directory with a structure like this:

```
. TOP LEVEL DIRECTORY
├── images
├── libraries
├── script
└── template
│   ├── templateOfInterest
│   │   └── exampleInput
│   └── ...
```

Note that the source of the built `template/` folder above is actually in `/web/templates/`, where example input data should be placed before performing the build process. One bundled example directory is:

- [`canada_covid19`](./web/templates/canada_covid19/exampleInput) CanCOGeN Covid-19


## Version Control

Versioning of templates, features, and functionality is modeled on semantic versioning, expressed as `MetadataHarmonizer X.Y.Z`.
Changes to vocabulary in template pick lists are updated by incremental increases to the third position in the version (i.e. “Z” position).
Changes to fields and features are updated by incremental increases to the second position in the version (i.e. “Y” position).
Changes to basic infrastructure or major changes to functionality are updated by incremental increases to the first position in the version (i.e. “X” position).

Descriptions of updates are provided in the [release notes](https://github.com/dhuzard/MetadataHarmonizer/releases) for each new version.

Discussions contributing to updates may be tracked on the MetadataHarmonizer GitHub issue tracker.

# Development

Code in this repository is split mainly between two folders: `lib` and `web`. The `lib` folder contains the core interface components which are published to NPM and can be used by any client to build a user interface. The `web` folder contains an implementation of one such interface, using the components defined in `lib`. The interface implemented in the `web` folder is packaged and [made available to users as releases of this repository](#Installation).

## Prerequisites

For development, you must have [Node.js](https://nodejs.org) and [Yarn](https://yarnpkg.com/getting-started/install) installed. If you have Node.js version 16.10 or later (highly recommended) and you have not used Yarn before, you can enable it by running:

```shell
corepack enable
```

## Installing

To install the dependencies of this package for development simply run:

```shell
yarn
```

## Running Locally

Developing either the library components in `lib` or the interface in `web` can be done using the same command:

```shell
yarn dev
```

This will start a [webpack development server](https://webpack.js.org/configuration/dev-server/) running locally on `localhost:8080`. You can connect to `localhost:8080` by inputing it into your browser URL bar while `yarn dev` is running. Changes to either `lib` or `web` should be loaded automatically in your browser. This serves as interface for testing and debugging the core library components (in the lib directory) and that interface itself (the web directory).

### Quick Experimentation

For faster local experiments, there are focused launchers for the main manual flows:

- `yarn experiment:tabular` preloads a bundled valid CSV into the main app.
- `yarn experiment:validation` preloads a bundled invalid CSV and runs validation immediately.
- `yarn experiment:tabulator` starts the dev server for the Tabulator spike path.
- `yarn experiment:revogrid` starts the dev server for the RevoGrid spike path.

Each launcher prints the exact local URL to open.

If you want to drive the same flows manually with query params, use:

```text
/?template=canada_covid19%2FCanCOGeN_Covid-19&exampleInput=validTestData_2-1-2.csv
/?template=canada_covid19%2FCanCOGeN_Covid-19&exampleInput=invalidTestData_1-0-0.csv&validate=1
/?template=canada_covid19%2FCanCOGeN_Covid-19&gridEngine=tabulator&gridSpike=1
/?template=canada_covid19%2FCanCOGeN_Covid-19&gridEngine=revogrid&gridSpike=1
```

Notes:

- `exampleInput` loads files from `web/templates/<schema>/exampleInput/`.
- Supported example-input types are `csv`, `tsv`, `xls`, `xlsx`, and `json`.
- Candidate grid engines are still spike-only. The shipped runtime remains Handsontable unless an engine is explicitly implemented.

Focused end-to-end checks are also available:

```shell
yarn test:e2e:example-input
yarn test:e2e:grid:smoke
yarn test:e2e:grid:spike
```

See [`docs/grid-engine/README.md`](./docs/grid-engine/README.md) for the spike-specific notes and rationale.

## Publishing and Releasing

To bundle the canonical interface run:

```shell
yarn build:web
```
You can open `web/dist/index.html` in your browser to test the distributable bundle and verify it runs in "offline".

To bundle the library components into lib/dist for downstream clients to use via API instead of the canonical interface, run:

```shell
yarn build:lib
```

## Making templates

With a `[schema name]` of your choice, work in **`/web/templates/[schema name]/`**
- Add one almost empty file **`export.js`** to the same folder.   It contains:
```
// A dictionary of possible export formats
export default {};
```
- Assemble one **`schema.yaml`** file by hand. It should be a merger of a valid linkml `schema.yaml` file (your existing schema) and at least an extra **`dh_interface`** class. The `dh_interface` class signals to MetadataHarmonizer to show the given class as a template menu option. Below we are using an AMBR class as an example:
 
```
classes:
  dh_interface:
    name: dh_interface
    description: A MetadataHarmonizer interface
    from_schema: https://example.com/AMBR # HERE CHANGE TO [schema name] URI
  AMBR:    # HERE CHANGE TO [schema name]
    name: AMBR
    description: The AMBR Project, led by the Harrison Lab at the University of Calgary,
      is an interdisciplinary study aimed at using 16S sequencing as part of a culturomics
      platform to identify antibiotic potentiators from the natural products of microbiota.
      The AMBR MetadataHarmonizer template was designed to standardize contextual data
      associated with the isolate repository from this work.
    is_a: dh_interface
```
 - Optionally add all the `types: {}` from one of the other specification `schema.core.yaml` file examples existing in `/web/templates/`, since this allows DH things like the "provenance" slot, and allows use of the `whitespaceMinimizedString` datatype which blocks unnecessary spaces, but this is not essential.

```
types:
  WhitespaceMinimizedString:
    name: 'WhitespaceMinimizedString'
    typeof: string
    description: 'A string that has all whitespace trimmed off of beginning and end, and all internal whitespace segments reduced to single spaces. Whitespace includes #x9 (tab), #xA (linefeed), and #xD (carriage return).'
    base: str
    uri: xsd:token
  Provenance:
    name: 'Provenance'
    typeof: string
    description: 'A field containing a MetadataHarmonizer versioning marker. It is issued by MetadataHarmonizer when validation is applied to a given row of data.'
    base: str
    uri: xsd:token
```
- Generate the `schema.json` file in that file’s template folder (`/web/templates/[schema name]/`) by running

```shell
python ../../../script/linkml.py -i schema.yaml
```
 
This will also add a menu item for your specification by adjusting `/web/templates/menu.json`.

- Check the updated `/web/templates/menu.json`. With this example, the template menu will be "ambr/AMBR".

```json
 "ambr": {
    "AMBR": { # Make sure the right class is called by DH
      "name": "AMBR",
      "status": "published",
      "display": true # Make sure the status is set to true
    }
```
 
- Test your template, by going to the DH root folder and type (as documented on github main code page):

```shell
yarn dev
```

You can then browse to <http://localhost:8080> to try out the template.

- you can then build a stand alone set of JS files in `/web/dist/`

```shell
yarn build:web
```
The `/web/dist/` folder can then be zipped or copied separately to wherever you want to make the app available.


`TODO: describe how to use the MetadataHarmonizer javascript API.`

## Roadmap

This project is in active development, with new features and template work added as needed for broader metadata harmonization use cases.

# Support

If you have ideas for improving the application, or encounter problems running it, [please open an issue for discussion][1].

[1]: https://github.com/dhuzard/MetadataHarmonizer/issues

## Additional Information

For more information about the original DataHarmonizer project and some legacy template and workflow documentation, see the upstream [DataHarmonizer Wiki](https://github.com/Public-Health-Bioinformatics/DataHarmonizer/wiki).

## Licensing

The repository source code for this fork is distributed under the [MIT](LICENSE) license. The `LICENSE` file currently retains the upstream copyright notice from the original project.

Important third-party licensing notes for the current codebase:

- Handsontable is the active shipped grid runtime. The package in this repository declares `SEE LICENSE IN LICENSE.txt`, and the application currently instantiates Handsontable with the `non-commercial-and-evaluation` license key in code. If you intend to use MetadataHarmonizer commercially, review Handsontable's license terms separately.
- SheetJS `xlsx` is used for spreadsheet import and export under Apache 2.0.
- Tabulator and RevoGrid are included as candidate grid-engine spike dependencies. Their packages declare MIT licenses, but they are not the default production runtime in this repository today.

As long as Handsontable remains bundled and used as the shipped runtime, its licensing terms remain relevant to this project. If and when Handsontable is fully removed in a later migration phase, this section should be revisited to reflect the new runtime dependency set.

When redistributing MetadataHarmonizer, preserve this repository's MIT license notice and comply with the licenses and terms of bundled third-party dependencies. This section is only a summary of the current repository state; the actual governing terms remain the license files and upstream package terms.
