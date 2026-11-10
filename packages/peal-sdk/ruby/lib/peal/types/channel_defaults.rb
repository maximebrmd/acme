# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChannelDefaults < Internal::Types::Model
      field :options, -> { Peal::Types::TargetOptions }, optional: false, nullable: true
    end
  end
end
