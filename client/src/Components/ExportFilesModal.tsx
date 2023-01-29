import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMemo, useState, useEffect } from "react";
import { Modal, Container, Row, Col, Button, OverlayTrigger, Tooltip, Form } from "react-bootstrap";
import Environment from "../Data/Environment";
import GetFileExportParametersRequest from "../Data/Model/GetFileExportParametersRequest";
import GetFileExportParametersResponse from "../Data/Model/GetFileExportParametersResponse";
import ScriptGenerationOptions from "../Data/Model/ScriptGenerationOptions";
import FileService from "../Services/FileService";
import ParameterApiService from "../Services/ParameterApiService";
import TemplateOption from "./TemplateOption";

type ExportFilesModalProps = {
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>
  templateOptions: Record<string, string[]>;
}

function ExportFilesModal({show, setShow, templateOptions}: ExportFilesModalProps) {
  const parameterApiService = useMemo(() => new ParameterApiService(), []);
  const fileService = useMemo(() => new FileService(), []);
  
  const [fileOutput, setFileOutput] = useState('');
  const [recentlyCopied, setRecentlyCopied] = useState(false);
  const [selectedTemplateOptions, setSelectedTemplateOptions] = useState<Record<string, string[]>>({});
  const [fileExport, setFileExport] = useState<GetFileExportParametersResponse>();

  //revert script options
  const [scriptOptions, setScriptOptions] = useState<ScriptGenerationOptions>({
    includeDateHeader: false,
    includeEnvironmentHeader: true,
    overwrite: true,
    revertOnly: false,
    selfDestructAfter: true,
    selfDestructAfterReverting: true,
    backupLocation: './backup',
    envFileName: '.env',
    revertScriptFilePath: './revertEnvVars.sh'
  });

  const [generateRevert, setGenerateRevertFile] = useState(true);
  const [backupFiles, setBackupFiles] = useState(true);
  
  const handleClose = () => setShow(false);

  useEffect(() => {
    if(!recentlyCopied) return;
    setTimeout(() => {
      setRecentlyCopied(false);
    }, 2000);
  }, [recentlyCopied]);

  useEffect(() => {
    if(!fileExport) {
      setFileOutput('');
      return;
    }

    var script = fileService.generateScript(fileExport.files, {
      ...scriptOptions,
      revertScriptFilePath : generateRevert ? scriptOptions.revertScriptFilePath : '',
      backupLocation : backupFiles ? scriptOptions.backupLocation : ''
    });
    setFileOutput(script.toString());
  }, [fileService, fileExport, scriptOptions]);

  const setSelectedOptions = (name: string, values: string[]) => {
    selectedTemplateOptions[name] = values;
    setSelectedTemplateOptions({...selectedTemplateOptions});
    setFileOutput('');
    setFileExport(undefined);
  }

  const copyFile = () => {
    navigator.clipboard.writeText(fileOutput);
    setRecentlyCopied(true);
  }

  const generateFile = () => {
    var request : GetFileExportParametersRequest = {
      template: Environment.defaultTemplate,
      templateValues: selectedTemplateOptions
    };
    parameterApiService.getFileExport(request).then(res => {
      setFileExport(res);
    });
  }

  const scriptWillBackup = backupFiles && scriptOptions.backupLocation;

  return (
    <Modal show={show} onHide={handleClose} size='xl' centered>
      <Modal.Header closeButton>
        <Container>
          <Row className='justify-content-md-center'>
            <Col><strong>Export to .Env files</strong></Col>
          </Row>
        </Container>
      </Modal.Header>
      <Modal.Body>
        <Container>
          {templateOptions && <Row>
            {templateOptions && Object.keys(templateOptions).map((key, idx) => {
              return <TemplateOption key={idx} name={key} values={Object.values(templateOptions)[idx]} isMultiple={true} setMultipleSelection={setSelectedOptions} />
            })}
            
            <Col xs="auto">
              <div><strong>Script options</strong></div>
              <Form.Control id="envFileName" value={scriptOptions.envFileName!} onChange={e => setScriptOptions({... scriptOptions, envFileName: e.target.value})} />
              <Form.Check id="backupCheckbox" label="Back-up files?" checked={backupFiles} onChange={e => setBackupFiles(e.target.checked)} />
              <Form.Control id="backupLocation" value={scriptOptions.backupLocation} onChange={e => setScriptOptions({...scriptOptions, backupLocation: e.target.value})} disabled={!backupFiles} />
              <Form.Check id="overwriteRadio" label="Overwrite" type="radio" checked={scriptOptions.overwrite} onChange={e => setScriptOptions({...scriptOptions, overwrite: e.target.checked})} inline />
              <Form.Check id="appendRadio" label="Append" type="radio" checked={!scriptOptions.overwrite} onChange={e => setScriptOptions({...scriptOptions, overwrite: !e.target.checked})} inline />
              <Form.Check id="environmentHeaderCheckbox" label="Environment header?" checked={scriptOptions.includeEnvironmentHeader} onChange={e => setScriptOptions({...scriptOptions, includeEnvironmentHeader: e.target.checked})} />
              <Form.Check id="selfDestructCheckbox" label="Delete script after?" checked={scriptOptions.selfDestructAfter} onChange={e => setScriptOptions({...scriptOptions, selfDestructAfter: e.target.checked})} />
            </Col>
            <Col xs="auto">
              <div><strong>Revert script options</strong></div>
              <Form.Check id="generateRevertCheckbox" label="Generate revert file" checked={generateRevert} onChange={e => setGenerateRevertFile(e.target.checked)} />
              <Form.Control id="revertScriptPath" value={scriptOptions.revertScriptFilePath!} onChange={e => setScriptOptions({...scriptOptions, revertScriptFilePath: e.target.value})} disabled={!generateRevert || scriptOptions.revertOnly} />
              <Form.Check id="selfDestructRevertCheckbox" label="Delete script after reverting?" checked={scriptOptions.selfDestructAfterReverting} onChange={e => setScriptOptions({...scriptOptions, selfDestructAfterReverting: e.target.checked})} />
              <Form.Check id="revertOnlyCheckbox" label="Generate ONLY revert file" checked={scriptOptions.revertOnly} onChange={e => setScriptOptions({...scriptOptions, revertOnly: e.target.checked})} />
            </Col>
          </Row>}
          <Row className="pt-3">
          <Col xs="auto" >
              <Button variant="success" onClick={_ => generateFile()}>Generate Script</Button>
            </Col>
          </Row>
          <Row className="pt-3">
            {fileOutput && <Col>
              <div><strong>Directions</strong></div>
              <div>Save the script on the right to your environment directoy.</div>
              {!scriptOptions.revertOnly && <div>
                It will create the following files containing environment variables:
                <ul>
                  {fileExport && fileExport.files.map((x, idx) => {
                    return <li key={idx}><code>{`./${x.path}/${scriptOptions.envFileName}`}</code></li>
                  })}
                </ul>
              </div>}
              <div>
                The script <span className={scriptWillBackup ? "text-success" : "text-danger"}>will{!scriptWillBackup ? ' not': ''}</span> generate a backup{scriptOptions.backupLocation ? <> at <code>{scriptOptions.backupLocation}</code></> : ''}.
              </div>
              {!scriptOptions.revertOnly && generateRevert && <div>
                Running the script will also generate a revert file at <code>{scriptOptions.revertScriptFilePath}</code> that you can run to revert the changes.
              </div>}
            </Col>}
            {fileOutput && <Col>
              {(fileExport?.files.length ?? 0) > 0 && <b>Script</b>}
              {(fileExport?.files.length ?? 0) > 0 && <div className="file">
                <div style={{position: 'relative'}}>
                  <div className="copy-file-button">
                    <OverlayTrigger placement='top' overlay={<Tooltip id={'tooltip-copy-env'}>{recentlyCopied ? 'Copied!' : 'Copy file to clipboard'}</Tooltip>}>
                      <FontAwesomeIcon icon={faCopy} onClick={_ => copyFile()} />
                    </OverlayTrigger>
                  </div>
                </div>
                {fileOutput}
              </div>}
            </Col>}
          </Row>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ExportFilesModal;