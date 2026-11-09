<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChoosableAccount extends JsonSerializableType
{
    /**
     * @var string $accountId
     */
    #[JsonProperty('accountId')]
    public string $accountId;

    /**
     * @var ?string $avatarUrl
     */
    #[JsonProperty('avatarUrl')]
    public ?string $avatarUrl;

    /**
     * @var bool $connected
     */
    #[JsonProperty('connected')]
    public bool $connected;

    /**
     * @var ?string $displayName
     */
    #[JsonProperty('displayName')]
    public ?string $displayName;

    /**
     * @var string $handle
     */
    #[JsonProperty('handle')]
    public string $handle;

    /**
     * @param array{
     *   accountId: string,
     *   connected: bool,
     *   handle: string,
     *   avatarUrl?: ?string,
     *   displayName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountId = $values['accountId'];
        $this->avatarUrl = $values['avatarUrl'] ?? null;
        $this->connected = $values['connected'];
        $this->displayName = $values['displayName'] ?? null;
        $this->handle = $values['handle'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
