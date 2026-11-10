<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PostImport extends JsonSerializableType
{
    /**
     * @var ?string $idempotencyKey
     */
    public ?string $idempotencyKey;

    /**
     * @var string $csv
     */
    #[JsonProperty('csv')]
    public string $csv;

    /**
     * @var ?bool $dryRun
     */
    #[JsonProperty('dryRun')]
    public ?bool $dryRun;

    /**
     * @param array{
     *   csv: string,
     *   idempotencyKey?: ?string,
     *   dryRun?: ?bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->idempotencyKey = $values['idempotencyKey'] ?? null;
        $this->csv = $values['csv'];
        $this->dryRun = $values['dryRun'] ?? null;
    }
}
