# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class NewPost < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotency-key"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

        field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

        field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false

        field :when_, -> { Peal::Types::PostTiming }, optional: false, nullable: false, api_name: "when"
      end
    end
  end
end
