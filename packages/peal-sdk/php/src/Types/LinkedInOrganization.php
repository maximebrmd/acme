<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class LinkedInOrganization extends JsonSerializableType
{
    /**
     * @var string $name
     */
    #[JsonProperty('name')]
    public string $name;

    /**
     * @var string $urn
     */
    #[JsonProperty('urn')]
    public string $urn;

    /**
     * @var ?string $vanityName
     */
    #[JsonProperty('vanityName')]
    public ?string $vanityName;

    /**
     * @param array{
     *   name: string,
     *   urn: string,
     *   vanityName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->name = $values['name'];
        $this->urn = $values['urn'];
        $this->vanityName = $values['vanityName'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
