<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AdConnection extends JsonSerializableType
{
    /**
     * @var value-of<AdAccess> $access
     */
    #[JsonProperty('access')]
    public string $access;

    /**
     * @var string $createdAt
     */
    #[JsonProperty('createdAt')]
    public string $createdAt;

    /**
     * @var ?string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public ?string $expiresAt;

    /**
     * @var ?string $grantedBy
     */
    #[JsonProperty('grantedBy')]
    public ?string $grantedBy;

    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var bool $maySpend
     */
    #[JsonProperty('maySpend')]
    public bool $maySpend;

    /**
     * @var value-of<AdNetwork> $network
     */
    #[JsonProperty('network')]
    public string $network;

    /**
     * @param array{
     *   access: value-of<AdAccess>,
     *   createdAt: string,
     *   id: string,
     *   maySpend: bool,
     *   network: value-of<AdNetwork>,
     *   expiresAt?: ?string,
     *   grantedBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->access = $values['access'];
        $this->createdAt = $values['createdAt'];
        $this->expiresAt = $values['expiresAt'] ?? null;
        $this->grantedBy = $values['grantedBy'] ?? null;
        $this->id = $values['id'];
        $this->maySpend = $values['maySpend'];
        $this->network = $values['network'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
