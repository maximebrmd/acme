# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostUnpublish < Internal::Types::Model
      field :changes, -> { Internal::Types::Array[Peal::Types::LivePostChange] }, optional: false, nullable: false

      field :refused, -> { Internal::Types::Array[Peal::Types::LivePostRefusedTarget] }, optional: false, nullable: false
    end
  end
end
