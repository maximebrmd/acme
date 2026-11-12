<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CredentialApplication extends JsonSerializableType
{
    /**
     * @var CredentialBinding $binding
     */
    #[JsonProperty('binding')]
    public CredentialBinding $binding;

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
     * @param array{
     *   binding: CredentialBinding,
     *   clientId: string,
     *   scopes: array<string>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->binding = $values['binding'];
        $this->clientId = $values['clientId'];
        $this->scopes = $values['scopes'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
