# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class NewPost < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :wait, -> { String }, optional: true, nullable: false

        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotency-key"

        field :allow_duplicate, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "allowDuplicate"

        field :channel_ids, -> { Internal::Types::Array[String] }, optional: false, nullable: false, api_name: "channelIds"

        field :channel_sets, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "channelSets"

        field :content, -> { Peal::Types::PostContent }, optional: false, nullable: false

        field :default_signatures, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "defaultSignatures"

        field :options, -> { Internal::Types::Array[Peal::Types::ChannelOptions] }, optional: true, nullable: false

        field :signature_id, -> { String }, optional: true, nullable: false, api_name: "signatureId"

        field :tag_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "tagIds"

        field :when_, -> { Peal::Types::PostTiming }, optional: false, nullable: false, api_name: "when"
      end
    end
  end
end
