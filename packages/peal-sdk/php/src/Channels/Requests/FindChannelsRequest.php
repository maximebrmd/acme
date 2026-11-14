<?php

namespace Peal\Channels\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Types\ChannelPlatform;
use Peal\Types\ChannelStatusName;

class FindChannelsRequest extends JsonSerializableType
{
    /**
     * @var ?string $cursor
     */
    public ?string $cursor;

    /**
     * @var ?string $limit
     */
    public ?string $limit;

    /**
     * @var ?value-of<ChannelPlatform> $platform
     */
    public ?string $platform;

    /**
     * @var ?string $q
     */
    public ?string $q;

    /**
     * @var ?value-of<ChannelStatusName> $status
     */
    public ?string $status;

    /**
     * @param array{
     *   cursor?: ?string,
     *   limit?: ?string,
     *   platform?: ?value-of<ChannelPlatform>,
     *   q?: ?string,
     *   status?: ?value-of<ChannelStatusName>,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->cursor = $values['cursor'] ?? null;
        $this->limit = $values['limit'] ?? null;
        $this->platform = $values['platform'] ?? null;
        $this->q = $values['q'] ?? null;
        $this->status = $values['status'] ?? null;
    }
}
