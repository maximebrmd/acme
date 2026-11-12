<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CredentialApplication extends JsonSerializableType
{
    /**
     * @var string $clientId
     */
    #[JsonProperty('clientId')]
    public string $clientId;

    /**
     * @var array<string> $scopes
     */
    #[JsonProperty('scopes'), ArrayType(['string'])]
    public array $scopes;

    /**
     * @var ?CredentialBoundWorkspace $workspace
     */
    #[JsonProperty('workspace')]
    public ?CredentialBoundWorkspace $workspace;

    /**
     * @param array{
     *   clientId: string,
     *   scopes: array<string>,
     *   workspace?: ?CredentialBoundWorkspace,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clientId = $values['clientId'];
        $this->scopes = $values['scopes'];
        $this->workspace = $values['workspace'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
