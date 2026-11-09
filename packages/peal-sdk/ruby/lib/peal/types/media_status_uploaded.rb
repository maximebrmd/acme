# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaStatusUploaded < Internal::Types::Model
      field :probe, -> { Peal::Types::ProbeState }, optional: false, nullable: false
    end
  end
end
