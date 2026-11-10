# frozen_string_literal: true

require_relative "../../../peal"

module Peal
  module Review
    module Types
      class NewCommentAnchor < Internal::Types::Model
        field :channel_id, -> { String }, optional: false, nullable: false, api_name: "channelId"

        field :selection, -> { Peal::Review::Types::NewCommentAnchorSelection }, optional: true, nullable: false
      end
    end
  end
end
