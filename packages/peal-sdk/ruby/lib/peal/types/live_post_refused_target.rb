# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LivePostRefusedTarget < Internal::Types::Model
      field :reason, -> { Peal::Types::LivePostRefusal }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false, api_name: "targetId"
    end
  end
end
