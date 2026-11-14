<?php

namespace Peal\PartnerAccount\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class PartnerChange extends JsonSerializableType
{
    /**
     * @var ?string $accentColor
     */
    #[JsonProperty('accentColor')]
    public ?string $accentColor;

    /**
     * @var ?string $logoUrl
     */
    #[JsonProperty('logoUrl')]
    public ?string $logoUrl;

    /**
     * @var ?string $name
     */
    #[JsonProperty('name')]
    public ?string $name;

    /**
     * @var ?array<string> $returnOrigins
     */
    #[JsonProperty('returnOrigins'), ArrayType(['string'])]
    public ?array $returnOrigins;

    /**
     * @param array{
     *   accentColor?: ?string,
     *   logoUrl?: ?string,
     *   name?: ?string,
     *   returnOrigins?: ?array<string>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->accentColor = $values['accentColor'] ?? null;
        $this->logoUrl = $values['logoUrl'] ?? null;
        $this->name = $values['name'] ?? null;
        $this->returnOrigins = $values['returnOrigins'] ?? null;
    }
}
