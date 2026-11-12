<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class CredentialUser extends JsonSerializableType
{
    /**
     * @var ?CredentialApplication $application
     */
    #[JsonProperty('application')]
    public ?CredentialApplication $application;

    /**
     * @var ?string $impersonatedBy
     */
    #[JsonProperty('impersonatedBy')]
    public ?string $impersonatedBy;

    /**
     * @var string $userId
     */
    #[JsonProperty('userId')]
    public string $userId;

    /**
     * @param array{
     *   userId: string,
     *   application?: ?CredentialApplication,
     *   impersonatedBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->application = $values['application'] ?? null;
        $this->impersonatedBy = $values['impersonatedBy'] ?? null;
        $this->userId = $values['userId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
