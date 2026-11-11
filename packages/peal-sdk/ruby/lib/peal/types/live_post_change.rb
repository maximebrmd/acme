# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LivePostChange < Internal::Types::Model
      field :already_gone, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "alreadyGone"

      field :code, -> { String }, optional: false, nullable: true

      field :finished_at, -> { String }, optional: false, nullable: true, api_name: "finishedAt"

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Peal::Types::LivePostChangeKind }, optional: false, nullable: false

      field :parts_left, -> { Integer }, optional: false, nullable: false, api_name: "partsLeft"

      field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

      field :requested_at, -> { String }, optional: false, nullable: false, api_name: "requestedAt"

      field :status, -> { Peal::Types::LivePostChangeStatus }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end
